export const STANDARD_STAGES = [
  { name: "Idea Only", color: "#b8cbb8", textColor: "#102016" },
  { name: "Script/Lyrics Generation", color: "#0048ff", textColor: "#ffffff" },
  { name: "Audio/Album Generation", color: "#5f6974", textColor: "#ffffff" },
  { name: "Image/Video Generation", color: "#8a0000", textColor: "#ffffff" },
  { name: "Video Editing", color: "#168db5", textColor: "#ffffff" },
  { name: "SEO&Metadata", color: "#7fb7ff", textColor: "#0b2545" },
  { name: "Final Revision", color: "#ff75a8", textColor: "#2b1020" },
  { name: "Modifications Needed", color: "#883100", textColor: "#ffffff" },
] as const;

export const STANDARD_STAGE_NAMES: string[] = STANDARD_STAGES.map((stage) => stage.name);

export function getStageStyle(name: string | null | undefined) {
  return (
    STANDARD_STAGES.find((stage) => stage.name === name) ?? {
      name: name ?? "None",
      color: "#e2e8f0",
      textColor: "#334155",
    }
  );
}
