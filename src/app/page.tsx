"use client";

import React, { useState, useEffect } from "react";
import { Plus, FileText, Trash2, ArrowRight, Loader2, Award } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Gọi API lấy danh sách template đã lưu từ DB
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách mẫu:", err);
    } finally {
      setLoading(false);
    }
  };

  // Xóa template
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu chứng chỉ này không?")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setTemplates(templates.filter((t) => t.id !== id));
      } else {
        alert("Xóa thất bại!");
      }
    } catch (err) {
      alert("Lỗi khi xóa mẫu.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Award size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">CertStudio Dashboard</h1>
              <p className="text-sm text-slate-400">Quản lý và thiết kế mẫu chứng chỉ y khoa, danh sách hàng loạt</p>
            </div>
          </div>

          <Link
            href="/editor"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl flex items-center gap-2 text-sm shadow-lg transition transform active:scale-95"
          >
            <Plus size={18} /> Tạo Mẫu Mới
          </Link>
        </div>

        {/* DANH SÁCH MẪU ĐÃ LƯU */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-200">Mẫu Chứng Chỉ Đã Lưu ({templates.length})</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24 text-slate-500 gap-2">
              <Loader2 className="animate-spin" size={24} /> Đang tải danh sách...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl space-y-3">
              <FileText className="mx-auto text-slate-600" size={48} />
              <p className="text-slate-400 text-sm">Chưa có mẫu chứng chỉ nào được lưu trong Database.</p>
              <Link
                href="/editor"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline"
              >
                Bắt đầu thiết kế ngay <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => router.push(`/editor?id=${tmpl.id}`)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer group flex flex-col"
                >
                  {/* Thumbnail ảnh nền chứng chỉ */}
                  <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                    {tmpl.bgImage ? (
                      <img
                        src={tmpl.bgImage}
                        alt={tmpl.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <FileText className="text-slate-700" size={40} />
                    )}
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-[10px] px-2 py-1 rounded text-slate-300 font-medium border border-slate-700">
                      {tmpl.fields?.length || 0} trường dữ liệu
                    </span>
                  </div>

                  {/* Thông tin mẫu */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white text-base truncate group-hover:text-blue-400 transition">
                        {tmpl.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Ngày tạo: {new Date(tmpl.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/80">
                      <span className="text-xs font-medium text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                        Chỉnh sửa mẫu <ArrowRight size={12} />
                      </span>
                      <button
                        onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Xóa mẫu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}