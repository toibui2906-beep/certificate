import React from "react";
import { Trash2, Bold, Italic, Underline } from "lucide-react";
import { CanvasField } from "./CertEditor";

interface FieldConfigPanelProps {
  selectedField: CanvasField;
  excelColumns: string[];
  onUpdateField: (updated: CanvasField) => void;
  onDeleteField: (id: string) => void;
}

export function FieldConfigPanel({
  selectedField,
  excelColumns,
  onUpdateField,
  onDeleteField,
}: FieldConfigPanelProps) {
  const handleChange = (key: keyof CanvasField, value: any) => {
    onUpdateField({ ...selectedField, [key]: value });
  };

  return (
    <div className="bg-slate-700/90 p-3.5 rounded-xl border border-blue-500 space-y-3 shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Cấu hình ô chữ</h3>
        <button
          onClick={() => onDeleteField(selectedField.id)}
          className="text-red-400 hover:text-red-300 p-1 rounded transition"
          title="Xóa ô này"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Chọn loại Text: Động (Excel) hay Cố định */}
      <div>
        <label className="text-[11px] text-slate-300 block mb-1">Loại nội dung:</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleChange("type", "dynamic")}
            className={`flex-1 py-1 text-xs rounded border transition ${
              selectedField.type === "dynamic"
                ? "bg-blue-600 border-blue-500 text-white font-medium"
                : "bg-slate-900 border-slate-600 text-slate-400"
            }`}
          >
            Cột Excel
          </button>
          <button
            type="button"
            onClick={() => handleChange("type", "static")}
            className={`flex-1 py-1 text-xs rounded border transition ${
              selectedField.type === "static"
                ? "bg-blue-600 border-blue-500 text-white font-medium"
                : "bg-slate-900 border-slate-600 text-slate-400"
            }`}
          >
            Chữ Cố Định
          </button>
        </div>
      </div>

      {/* Nội dung tương ứng */}
      {selectedField.type === "dynamic" ? (
        <div>
          <label className="text-[11px] text-slate-300 block mb-1">Gắn với cột Excel:</label>
          <select
            value={selectedField.excelColumn || ""}
            onChange={(e) => handleChange("excelColumn", e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-xs text-white"
          >
            {excelColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="text-[11px] text-slate-300 block mb-1">Nội dung chữ:</label>
          <input
            type="text"
            value={selectedField.textContent || ""}
            onChange={(e) => handleChange("textContent", e.target.value)}
            placeholder="Nhập nội dung..."
            className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-xs text-white"
          />
        </div>
      )}

      {/* Cỡ chữ và Màu chữ */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-300 block mb-1">Cỡ chữ (px):</label>
          <input
            type="number"
            value={selectedField.fontSize}
            onChange={(e) => handleChange("fontSize", Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-300 block mb-1">Màu chữ:</label>
          <input
            type="color"
            value={selectedField.color}
            onChange={(e) => handleChange("color", e.target.value)}
            className="w-full h-8 bg-slate-900 border border-slate-600 rounded cursor-pointer p-0.5"
          />
        </div>
      </div>

      {/* Font chữ */}
      <div>
        <label className="text-[11px] text-slate-300 block mb-1">Kiểu Font chữ:</label>
        <select
          value={selectedField.fontFamily}
          onChange={(e) => handleChange("fontFamily", e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-xs text-white"
        >
          <option value="Times New Roman">Times New Roman (Chuẩn chứng chỉ)</option>
          <option value="Arial">Arial</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>

      {/* Định dạng chữ: Đậm, Nghiêng, Gạch chân */}
      <div>
        <label className="text-[11px] text-slate-300 block mb-1">Định dạng kiểu chữ:</label>
        <div className="flex gap-1 bg-slate-900 p-1 rounded border border-slate-600">
          <button
            type="button"
            onClick={() => handleChange("isBold", !selectedField.isBold)}
            className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center transition ${
              selectedField.isBold ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="In đậm"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleChange("isItalic", !selectedField.isItalic)}
            className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center transition ${
              selectedField.isItalic ? "bg-blue-600 text-white italic" : "text-slate-400 hover:text-white"
            }`}
            title="In nghiêng"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleChange("isUnderline", !selectedField.isUnderline)}
            className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center transition ${
              selectedField.isUnderline ? "bg-blue-600 text-white underline" : "text-slate-400 hover:text-white"
            }`}
            title="Gạch chân"
          >
            <Underline size={14} />
          </button>
        </div>
      </div>

      {/* Căn lề */}
      <div>
        <label className="text-[11px] text-slate-300 block mb-1">Căn lề:</label>
        <div className="flex gap-1 bg-slate-900 p-1 rounded border border-slate-600">
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => handleChange("textAlign", align)}
              className={`flex-1 py-1 text-xs rounded capitalize transition ${
                selectedField.textAlign === align ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}