// LeRobot native units -> fitted MuJoCo joint coordinates; the inverse feeds ACT.
export const nativeToJoint = (value, joint, layout) => value * layout.jointScales[joint] + layout.jointOffsets[joint];
export const jointToNative = (value, joint, layout) => (value - layout.jointOffsets[joint]) / layout.jointScales[joint];
