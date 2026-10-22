"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import {
  Upload,
  Save,
  Trash2,
  Plus,
  Bold,
  Italic,
  Underline,
  ArrowLeft,
  Activity,
  ShieldCheck,
  FileImage,
  FileSpreadsheet,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f3f8fa] text-slate-600">
          Đang tải giao diện chỉnh sửa...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}

function EditorContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("id");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"design" | "batch">("design");
  const [templateName, setTemplateName] = useState("Mẫu Chứng Chỉ Mới");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 800, height: 600 });
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [skipHeader, setSkipHeader] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Quy tắc đặt tên file
  const [nameColumn1, setNameColumn1] = useState<string>("");
  const [nameColumn2, setNameColumn2] = useState<string>("");

  const [fields, setFields] = useState<CanvasField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingItem = useRef<string | null>(null);

  // Hàm loại bỏ dấu tiếng Việt và ký tự đặc biệt cho tên file
  const removeVietnameseAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, (char) => (char === "đ" ? "d" : "D"))
      .replace(/[/\\?%*:|"<>]/g, "_")
      .trim();
  };

  // Tự động đo kích thước thật của ảnh nền để chống bóp méo tỷ lệ
  useEffect(() => {
    if (bgImage) {
      const imgObj = new window.Image();
      imgObj.src = bgImage;
      imgObj.onload = () => {
        if (imgObj.naturalWidth && imgObj.naturalHeight) {
          setImageNaturalSize({
            width: imgObj.naturalWidth,
            height: imgObj.naturalHeight,
          });
        }
      };
    }
  }, [bgImage]);

  // Load thông tin mẫu từ DB nếu có ID trên URL (Đã fix đồng bộ posXPercent/posYPercent)
  useEffect(() => {
    if (templateId) {
      setLoading(true);
      fetch(`/api/templates/${templateId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const tmpl = json.data;
            setTemplateName(tmpl.name);
            setBgImage(tmpl.bgImage);

            const loadedFields = tmpl.fields.map((f: any) => ({
              id: f.id,
              type: f.type,
              excelColumn: f.excelColumn,
              textContent: f.textContent,
              xPercent: f.posXPercent ?? f.xPercent ?? 0,
              yPercent: f.posYPercent ?? f.yPercent ?? 0,
              fontSize: f.fontSize,
              color: f.color,
              fontFamily: f.fontFamily,
              textAlign: f.textAlign,
              isBold: f.isBold,
              isItalic: f.isItalic,
              isUnderline: f.isUnderline,
            }));
            setFields(loadedFields);
          }
        })
        .catch((err) => console.error("Lỗi tải template:", err))
        .finally(() => setLoading(false));
    }
  }, [templateId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultString = event.target?.result as string;
        if (resultString) {
          setBgImage(resultString);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSampleImage = () => {
    setBgImage("/CME_2026_A4_1.png");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length > 0) {
            const cols = Object.keys(jsonData[0] as object);
            setExcelColumns(cols);
            setExcelRows(jsonData);
            if (!nameColumn1 && cols.length > 0) setNameColumn1(cols[0]);
          } else {
            alert("File Excel trống!");
          }
        } catch (err) {
          alert("Lỗi đọc file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !bgImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const newField: CanvasField = {
      id: Date.now().toString(),
      type: excelColumns.length > 0 ? "dynamic" : "static",
      excelColumn: excelColumns.length > 0 ? excelColumns[0] : undefined,
      textContent: excelColumns.length > 0 ? undefined : "Chữ mẫu",
      xPercent,
      yPercent,
      fontSize: 22,
      color: "#000000",
      fontFamily: "Times New Roman",
      textAlign: "center",
      isBold: false,
      isItalic: false,
      isUnderline: false,
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const addNewField = (type: FieldType) => {
    const newField: CanvasField = {
      id: Date.now().toString(),
      type,
      excelColumn: type === "dynamic" && excelColumns.length > 0 ? excelColumns[0] : undefined,
      textContent: type === "static" ? "Chữ mới" : undefined,
      xPercent: 50,
      yPercent: 50,
      fontSize: 24,
      color: "#000000",
      fontFamily: "Times New Roman",
      textAlign: "center",
      isBold: false,
      isItalic: false,
      isUnderline: false,
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingItem.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setFields((prev) =>
      prev.map((f) => (f.id === draggingItem.current ? { ...f, xPercent, yPercent } : f))
    );
  };

  const handleMouseUp = () => {
    draggingItem.current = null;
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const updateSelectedField = (key: keyof CanvasField, value: any) => {
    if (!selectedFieldId) return;
    setFields(fields.map((f) => (f.id === selectedFieldId ? { ...f, [key]: value } : f)));
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Lưu Template vào DB
  const saveTemplateToDb = async () => {
    if (!bgImage) return alert("Chưa có ảnh nền!");
    
    if (!templateName || templateName.trim() === "") {
      return alert("Vui lòng nhập tên mẫu chứng chỉ!");
    }

    try {
      const url = templateId ? `/api/templates/${templateId}` : "/api/templates";
      const method = templateId ? "PUT" : "POST";

      const payloadFields = fields.map((field) => ({
        type: field.type ?? "dynamic",
        excelColumn: field.excelColumn ?? null,
        textContent: field.textContent ?? null,
        posXPercent: Number(field.xPercent) || 0,
        posYPercent: Number(field.yPercent) || 0,
        fontSize: Number(field.fontSize) || 24,
        color: field.color ?? "#000000",
        fontFamily: field.fontFamily ?? "Times New Roman",
        isBold: Boolean(field.isBold),
        isItalic: Boolean(field.isItalic),
        isUnderline: Boolean(field.isUnderline),
        textAlign: field.textAlign ?? "center",
      }));

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          bgImage,
          width: imageNaturalSize.width,
          height: imageNaturalSize.height,
          fields: payloadFields,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert("Đã lưu mẫu thành công vào Database!");
        router.push("/");
      } else {
        alert("Lưu thất bại: " + (data.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      console.error("Lỗi kết nối:", err);
      alert("Lỗi kết nối khi lưu.");
    }
  };

  // Hàm Batch Export PDF chuẩn tỉ lệ kích thước ảnh gốc
  const handleBatchExportPdfZip = async () => {
    if (excelRows.length === 0) {
      return alert("Vui lòng tải lên file Excel trước khi xuất hàng loạt!");
    }
    if (!bgImage) {
      return alert("Chưa có ảnh nền chứng chỉ!");
    }

    setIsExporting(true);

    try {
      const startIndex = skipHeader ? 1 : 0;
      const rowsToExport = excelRows.slice(startIndex);

      if (rowsToExport.length === 0) {
        alert("Không có dữ liệu để xuất sau khi bỏ qua header!");
        setIsExporting(false);
        return;
      }

      const bgImgElement = new window.Image();
      bgImgElement.src = bgImage;
      await new Promise((resolve, reject) => {
        bgImgElement.onload = resolve;
        bgImgElement.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = imageNaturalSize.width;
      canvas.height = imageNaturalSize.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        alert("Không thể khởi tạo canvas context!");
        setIsExporting(false);
        return;
      }

      // Tính hệ số tỉ lệ scale giữa màn hình giao diện (width ~ 850px) với ảnh gốc (naturalWidth)
      const canvasDisplayWidth = canvasRef.current ? canvasRef.current.clientWidth : 850;
      const scaleFactor = imageNaturalSize.width / canvasDisplayWidth;

      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const datePrefix = `${yy}${mm}${dd}`;

      const zip = new JSZip();
      const folder = zip.folder("DanhSachChungChi_PDF");

      for (let i = 0; i < rowsToExport.length; i++) {
        const row = rowsToExport[i] as any;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImgElement, 0, 0, canvas.width, canvas.height);

        fields.forEach((field) => {
          let text = "";
          if (field.type === "dynamic") {
            text = field.excelColumn ? row[field.excelColumn] || "" : "";
          } else {
            text = field.textContent || "";
          }

          const x = (field.xPercent / 100) * canvas.width;
          const y = (field.yPercent / 100) * canvas.height;

          // Scale cỡ chữ phù hợp với độ phân giải thật của ảnh gốc
          const scaledFontSize = field.fontSize * scaleFactor;

          ctx.save();
          let fontStyle = "";
          if (field.isBold) fontStyle += "bold ";
          if (field.isItalic) fontStyle += "italic ";

          ctx.font = `${fontStyle}${scaledFontSize}px "${field.fontFamily || "Times New Roman"}", sans-serif`;
          ctx.fillStyle = field.color || "#000000";
          ctx.textAlign = field.textAlign || "center";
          ctx.textBaseline = "middle";

          ctx.fillText(text, x, y);

          if (field.isUnderline) {
            const textWidth = ctx.measureText(text).width;
            let startX = x;
            if (field.textAlign === "center") startX = x - textWidth / 2;
            else if (field.textAlign === "right") startX = x - textWidth;

            const underlineY = y + scaledFontSize / 2 + 2;
            ctx.strokeStyle = field.color || "#000000";
            ctx.lineWidth = Math.max(1, scaledFontSize / 15);
            ctx.beginPath();
            ctx.moveTo(startX, underlineY);
            ctx.lineTo(startX + textWidth, underlineY);
            ctx.stroke();
          }

          ctx.restore();
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        const pdfOrientation = canvas.width > canvas.height ? "landscape" : "portrait";
        const pdf = new jsPDF(pdfOrientation, "px", [canvas.width, canvas.height]);
        
        pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
        const pdfOutput = pdf.output("arraybuffer");

        const val1 = nameColumn1 && row[nameColumn1] ? String(row[nameColumn1]).trim() : `Item_${i + 1}`;
        const val2 = nameColumn2 && row[nameColumn2] ? `_${String(row[nameColumn2]).trim()}` : "";
        
        const rawFileName = `${datePrefix}_${val1}${val2}`;
        const safeName = removeVietnameseAccents(rawFileName);

        folder?.file(`${safeName}.pdf`, pdfOutput);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DanhSachChungChi_PDF_${datePrefix}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`Đã xuất và nén thành công ${rowsToExport.length} file PDF vào file ZIP!`);
    } catch (err) {
      console.error("Lỗi xuất file PDF:", err);
      alert("Đã xảy ra lỗi trong quá trình tạo file PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f8fa] text-slate-600">
        <p>Đang tải dữ liệu mẫu từ DB...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-[620px] overflow-hidden bg-[#f3f8fa] font-sans text-slate-800">
      {/* SIDEBAR TRÁI */}
      <aside className="z-10 flex w-[360px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-[4px_0_24px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-teal-700">
            <ArrowLeft size={14} /> Quay lại Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Activity size={23} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Healthcare Studio</p>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">CertStudio</h1>
          </div>
        </div>

        {/* PHÂN CHIA TAB THÂN THIỆN */}
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("design")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              activeTab === "design" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🎨 Thiết kế & Dữ liệu
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              activeTab === "batch" ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🚀 Xuất hàng loạt
          </button>
        </div>

        {activeTab === "design" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tên mẫu chứng chỉ</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              />
            </div>

            <section className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="flex items-center gap-2">
                <FileImage size={15} className="text-teal-700" />
                <label className="text-xs font-semibold text-slate-700">1. Ảnh nền chứng chỉ</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSelectSampleImage}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                >
                  Chọn mẫu sẵn
                </button>
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-2 py-2 text-xs font-semibold text-white transition hover:bg-teal-800">
                  <Upload size={12} /> Tải từ máy
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </section>

            <section className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-teal-700" />
                <label className="text-xs font-semibold text-slate-700">2. Dữ liệu Excel</label>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white p-2 text-xs text-slate-500"
              />
              {excelRows.length > 0 && (
                <p className="text-[11px] font-medium text-emerald-600">✓ Đã tải {excelRows.length} dòng dữ liệu</p>
              )}
            </section>

            {bgImage && (
              <section className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">3. Thêm trường văn bản</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => addNewField("dynamic")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
                  >
                    <Plus size={14} /> Cột Excel
                  </button>
                  <button
                    onClick={() => addNewField("static")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Plus size={14} /> Chữ Tĩnh
                  </button>
                </div>
              </section>
            )}

            {selectedField && (
              <section className="space-y-3.5 rounded-xl border border-teal-100 bg-[#f8fbfc] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">Cấu hình nội dung</h3>
                  <button
                    onClick={() => deleteField(selectedField.id)}
                    className="rounded-md p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                    title="Xóa ô này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Loại nội dung</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedField("type", "dynamic")}
                      className={`flex-1 py-1 text-xs rounded border transition ${
                        selectedField.type === "dynamic"
                          ? "border-teal-700 bg-teal-700 font-semibold text-white"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Cột Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedField("type", "static")}
                      className={`flex-1 py-1 text-xs rounded border transition ${
                        selectedField.type === "static"
                          ? "border-teal-700 bg-teal-700 font-semibold text-white"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Chữ Cố Định
                    </button>
                  </div>
                </div>

                {selectedField.type === "dynamic" ? (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Gắn với cột Excel</label>
                    <select
                      value={selectedField.excelColumn || ""}
                      onChange={(e) => updateSelectedField("excelColumn", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500"
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
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Nội dung chữ</label>
                    <input
                      type="text"
                      value={selectedField.textContent || ""}
                      onChange={(e) => updateSelectedField("textContent", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Cỡ chữ (px)</label>
                    <input
                      type="number"
                      value={selectedField.fontSize}
                      onChange={(e) => updateSelectedField("fontSize", Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">Màu chữ</label>
                    <input
                      type="color"
                      value={selectedField.color}
                      onChange={(e) => updateSelectedField("color", e.target.value)}
                      className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Kiểu font chữ</label>
                  <select
                    value={selectedField.fontFamily}
                    onChange={(e) => updateSelectedField("fontFamily", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none"
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Định dạng kiểu chữ</label>
                  <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => updateSelectedField("isBold", !selectedField.isBold)}
                      className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center transition ${
                        selectedField.isBold ? "bg-teal-700 text-white font-bold" : "text-slate-500 hover:bg-slate-50"
                      }`}
                      title="In đậm"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedField("isItalic", !selectedField.isItalic)}
                      className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center transition ${
                        selectedField.isItalic ? "bg-teal-700 text-white italic" : "text-slate-500 hover:bg-slate-50"
                      }`}
                      title="In nghiêng"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedField("isUnderline", !selectedField.isUnderline)}
                      className={`flex-1 py-1.5 text-xs rounded flex items-center justify-center transition ${
                        selectedField.isUnderline ? "bg-teal-700 text-white underline" : "text-slate-500 hover:bg-slate-50"
                      }`}
                      title="Gạch chân"
                    >
                      <Underline size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Căn lề</label>
                  <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateSelectedField("textAlign", align)}
                        className={`flex-1 py-1 text-xs rounded capitalize transition ${
                          selectedField.textAlign === align ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "batch" && (
          <div className="space-y-4">
            {excelRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Vui lòng tải lên file Excel ở tab &quot;Thiết kế & Dữ liệu&quot; trước khi cấu hình xuất hàng loạt.
              </div>
            ) : (
              <div className="space-y-3.5 rounded-xl border border-teal-100 bg-teal-50/70 p-4">
                <span className="block text-xs font-semibold text-slate-700">
                  Tổng số lượng: <span className="text-teal-800">{excelRows.length} dòng</span>
                </span>

                <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    Quy tắc đặt tên file PDF (Không dấu)
                  </span>
                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">Cột 1 (Ví dụ: Họ tên)</label>
                      <select
                        value={nameColumn1}
                        onChange={(e) => setNameColumn1(e.target.value)}
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="">-- Chọn cột 1 --</option>
                        {excelColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">Cột 2 (Ví dụ: Đơn vị)</label>
                      <select
                        value={nameColumn2}
                        onChange={(e) => setNameColumn2(e.target.value)}
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="">-- Trống (Không dùng) --</option>
                        {excelColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] italic text-slate-400">Định dạng: yymmdd_Cot1_Cot2.pdf</p>
                </div>

                <label className="flex cursor-pointer select-none items-start gap-2 text-xs leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={skipHeader}
                    onChange={(e) => setSkipHeader(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                  />
                  Bỏ qua dòng đầu tiên (Header / Tiêu đề cột)
                </label>

                <button
                  onClick={handleBatchExportPdfZip}
                  disabled={isExporting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isExporting ? "Đang tạo file PDF..." : "📄 Xuất & Tải xuống file PDF (.ZIP)"}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={saveTemplateToDb}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-900/15 transition hover:bg-teal-900 focus:outline-none focus:ring-4 focus:ring-teal-700/20"
        >
          <Save size={16} /> Lưu mẫu chứng chỉ
        </button>
      </aside>

      {/* WORKSPACE CANVAS PHẢI */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-7 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Không gian thiết kế</p>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900">Biên tập chứng chỉ y tế</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
            <ShieldCheck size={14} /> Sẵn sàng thiết kế
          </div>
        </header>
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#f3f8fa] p-6 select-none"
          style={{ backgroundImage: "radial-gradient(#cbd8dd 0.75px, transparent 0.75px)", backgroundSize: "18px 18px" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {bgImage ? (
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative max-w-full cursor-crosshair border border-slate-200 bg-white shadow-[0_20px_60px_rgba(30,64,75,0.16)]"
              style={{
                width: "min(850px, 100%)",
                aspectRatio: `${imageNaturalSize.width} / ${imageNaturalSize.height}`,
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
              }}
            >
              {fields.map((field) => {
                let displayValue = "";
                if (field.type === "dynamic") {
                  displayValue =
                    excelRows[currentRowIndex]?.[field.excelColumn || ""] ||
                    `[ ${field.excelColumn || "Chọn cột"} ]`;
                } else {
                  displayValue = field.textContent || "[Chữ trống]";
                }

                const isSelected = field.id === selectedFieldId;

                return (
                  <div
                    key={field.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                      draggingItem.current = field.id;
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute group cursor-move px-2 py-1 transition-shadow ${
                      isSelected
                        ? "z-20 rounded bg-teal-500/10 shadow-md ring-2 ring-teal-600"
                        : "z-10 hover:rounded hover:bg-teal-500/5 hover:ring-1 hover:ring-teal-500/60"
                    }`}
                    style={{
                      left: `${field.xPercent}%`,
                      top: `${field.yPercent}%`,
                      transform: "translate(-50%, -50%)",
                      textAlign: field.textAlign,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: `${field.fontSize}px`,
                        color: field.color,
                        fontFamily: `"${field.fontFamily}", serif`,
                        fontWeight: field.isBold ? "bold" : "normal",
                        fontStyle: field.isItalic ? "italic" : "normal",
                        textDecoration: field.isUnderline ? "underline" : "none",
                      }}
                    >
                      {displayValue}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteField(field.id);
                      }}
                      className="absolute -right-3 -top-3 rounded-full bg-rose-600 p-1 text-white opacity-0 shadow transition hover:bg-rose-700 group-hover:opacity-100"
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-md rounded-2xl border border-dashed border-slate-300 bg-white/90 px-10 py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <Upload size={26} />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Bắt đầu thiết kế chứng chỉ</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Tải lên hoặc chọn mẫu có sẵn để thêm thông tin và tùy chỉnh bản xem trước.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}