import { nativeToJoint } from './joint-mapping.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { woodTexture } from './wood.js';
import loadMujoco from './node_modules/@mujoco/mujoco/mujoco.js';

const $ = id => document.getElementById(id);
let layout, HOME, recordedActions;
const setStatus = text => { $('status').textContent = text; };
let mj, model, data, renderer, scene, camera, orbit;
let mode = 'idle', actionIndex = 0, nextAction = 0;
let penBody, meshes = [], joints = [];
let previousTime = performance.now(), accumulator = 0;
const matrix = new THREE.Matrix4();

async function get(path, binary = false) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return binary ? new Uint8Array(await response.arrayBuffer()) : response.text();
}
function nameId(kind, name) { return mj.mj_name2id(model, kind.value, name); }
function poseFromMatrix(object, pos, rot, index) {
  object.position.fromArray(pos, index * 3);
  const o = index * 9;
  matrix.set(rot[o],rot[o+1],rot[o+2],0,rot[o+3],rot[o+4],rot[o+5],0,rot[o+6],rot[o+7],rot[o+8],0,0,0,0,1);
  object.quaternion.setFromRotationMatrix(matrix);
}
function geometryFor(i) {
  const type = model.geom_type[i], s = model.geom_size.slice(i*3,i*3+3);
  if (type === mj.mjtGeom.mjGEOM_MESH.value) {
    const id=model.geom_dataid[i], v=model.mesh_vertadr[id], n=model.mesh_vertnum[id], f=model.mesh_faceadr[id], nf=model.mesh_facenum[id];
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(model.mesh_vert.slice(v*3,(v+n)*3),3));
    g.setIndex(Array.from(model.mesh_face.slice(f*3,(f+nf)*3)));
    g.computeVertexNormals(); return g;
  }
  if(type===mj.mjtGeom.mjGEOM_BOX.value)return new THREE.BoxGeometry(s[0]*2,s[1]*2,s[2]*2);
  if(type===mj.mjtGeom.mjGEOM_PLANE.value)return new THREE.PlaneGeometry(12,12);
  if(type===mj.mjtGeom.mjGEOM_SPHERE.value)return new THREE.SphereGeometry(s[0],24,16);
  if(type===mj.mjtGeom.mjGEOM_CYLINDER.value)return new THREE.CylinderGeometry(s[0],s[0],2*s[1],32).rotateX(Math.PI/2);
  if(type===mj.mjtGeom.mjGEOM_CAPSULE.value)return new THREE.CapsuleGeometry(s[0],2*s[1],8,24).rotateX(Math.PI/2);
  return null;
}
function createScene() {
  THREE.Object3D.DEFAULT_UP.set(0,0,1);
  renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  scene=new THREE.Scene();scene.background=new THREE.Color('#071f1d');
  camera=new THREE.PerspectiveCamera(layout.cameraFov,1,.01,15);camera.position.fromArray(layout.cameraPosition);
  orbit=new OrbitControls(camera,$('view'));orbit.target.fromArray(layout.cameraTarget);orbit.enableDamping=true;
  orbit.minDistance=.32;orbit.maxDistance=2.6;orbit.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight(0xf4f5f3,0x777060,1.35));
  const sun=new THREE.DirectionalLight(0xfff7e9,1.7);sun.position.set(-.4,-.25,1.5);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-.7,right:.7,top:.7,bottom:-.7,near:.01,far:4});sun.shadow.bias=-.00015;
  scene.add(sun);scene.add(sun.target);
  const fill=new THREE.DirectionalLight(0xffffff,.45);fill.position.set(-.5,.7,.6);scene.add(fill);
  const wood=woodTexture();
  for(let i=0;i<model.ngeom;i++){
    if(model.geom_group[i]>=3)continue;
    const geometry=geometryFor(i);if(!geometry)continue;
    const materialId=model.geom_matid[i];
    const rgba=materialId>=0?model.mat_rgba.slice(materialId*4,materialId*4+4):model.geom_rgba.slice(i*4,i*4+4);
    const geomName=mj.mj_id2name(model,mj.mjtObj.mjOBJ_GEOM.value,i);
    const color=geomName==='table'?new THREE.Color('#ffffff'):new THREE.Color().setRGB(rgba[0],rgba[1],rgba[2]);
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,map:geomName==='table'?wood:null,roughness:geomName==='table'?.5:.82,metalness:0}));
    mesh.castShadow=model.geom_type[i]!==mj.mjtGeom.mjGEOM_PLANE.value;mesh.receiveShadow=true;
    mesh.userData.geom=i;mesh.userData.pen=model.geom_bodyid[i]===penBody;scene.add(mesh);meshes.push(mesh);
  }
  new ResizeObserver(()=>{const{width,height}=$('stage').getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(layout.cameraFov)/2)*Math.max(1,.9/camera.aspect)));camera.updateProjectionMatrix();}).observe($('stage'));
  syncMeshes();orbit.update();
}
function syncMeshes(){for(const mesh of meshes)poseFromMatrix(mesh,data.geom_xpos,data.geom_xmat,mesh.userData.geom);}
function reset(){
  mode='idle';actionIndex=0;accumulator=0;
  mj.mj_resetData(model,data);
  for(let i=0;i<6;i++){data.qpos[joints[i]]=HOME[i];data.ctrl[i]=HOME[i];}
  mj.mj_forward(model,data);syncMeshes();setStatus('');
}
function replayDemo(){
  reset();mode='replay';nextAction=data.time;setStatus('');
}
function applyActions(){
  if(mode!=='replay'||data.time+1e-9<nextAction)return;
  if(actionIndex>=recordedActions.length/6){mode='idle';setStatus('');return;}
  for(let i=0;i<6;i++){
    const joint=nativeToJoint(recordedActions[actionIndex*6+i],i,layout);
    data.ctrl[i]=Math.max(model.actuator_ctrlrange[i*2],Math.min(model.actuator_ctrlrange[i*2+1],joint));
  }
  actionIndex++;nextAction+=1/30;
}
function animate(now){
  requestAnimationFrame(animate);
  accumulator+=Math.min((now-previousTime)/1000,.04);previousTime=now;
  while(accumulator>=.002){applyActions();mj.mj_step(model,data);accumulator-=.002;}
  syncMeshes();orbit.update();renderer.render(scene,camera);
}
try{
  layout=JSON.parse(await get('./assets/so101/layout.json'));HOME=layout.home;
  recordedActions=new Float32Array(JSON.parse(await get('./assets/recorded-actions.json')).actions.flat());
  mj=await loadMujoco();
  const source=JSON.parse(await get('./assets/so101/source.json')),vfs=new mj.MjVFS();
  try{
    const files=source.files.filter(file=>file.endsWith('.stl'));
    const buffers=await Promise.all(files.map(file=>get('./assets/so101/'+file,true)));
    files.forEach((file,i)=>vfs.addBuffer(file,buffers[i]));
    model=mj.MjModel.from_xml_string(await get('./assets/so101/simulation.xml'),vfs);
  }finally{vfs.delete();}
  data=new mj.MjData(model);
  penBody=nameId(mj.mjtObj.mjOBJ_BODY,'pen');
  joints=['shoulder_pan','shoulder_lift','elbow_flex','wrist_flex','wrist_roll','gripper'].map(name=>model.jnt_qposadr[nameId(mj.mjtObj.mjOBJ_JOINT,name)]);
  mj.mj_forward(model,data);createScene();reset();
  $('reset').onclick=reset;$('replay').onclick=replayDemo;
  $('reset').disabled=false;$('replay').disabled=false;
  window.simulation={snapshot:()=>({time:data.time,mode,actionIndex,pen:Array.from(data.xpos.slice(penBody*3,penBody*3+3)),contacts:data.ncon})};
  requestAnimationFrame(animate);
  window.addEventListener('pagehide',()=>{data.delete();model.delete();renderer.dispose();},{once:true});
}catch(error){setStatus('Simulation unavailable');console.error(error);}
