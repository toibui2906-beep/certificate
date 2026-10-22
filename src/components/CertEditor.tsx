export type FieldType = "dynamic" | "static";

export interface CanvasField {
  id: string;
  type: FieldType;
  excelColumn?: string;
  textContent?: string;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  isBold?: boolean;      // Thêm mới
  isItalic?: boolean;    // Thêm mới
  isUnderline?: boolean; // Thêm mới
}