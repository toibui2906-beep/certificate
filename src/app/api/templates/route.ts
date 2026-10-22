import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, bgImage, fields } = body;

    const template = await prisma.template.create({
      data: {
        name: name || 'Mẫu Chứng Chỉ Mới',
        bgImage,
        fields: {
          create: (fields || []).map((f: any) => {
            // Hấp thụ linh hoạt cả xPercent, posXPercent, yPercent, posYPercent từ client gửi lên
            const rawX = f.posXPercent ?? f.xPercent;
            const rawY = f.posYPercent ?? f.yPercent;

            const posXPercent = Number(rawX);
            const posYPercent = Number(rawY);

            return {
              type: f.type || 'dynamic',
              excelColumn: f.excelColumn || "",
              textContent: f.textContent || null,
              // Đảm bảo không bị lọt về 0 nếu có dữ liệu
              posXPercent: Number.isFinite(posXPercent) ? posXPercent : 0,
              posYPercent: Number.isFinite(posYPercent) ? posYPercent : 0,
              fontSize: Number(f.fontSize) || 24,
              color: f.color || '#000000',
              fontFamily: f.fontFamily || 'Times New Roman',
              textAlign: f.textAlign || 'center',
              isBold: Boolean(f.isBold),
              isItalic: Boolean(f.isItalic),
              isUnderline: Boolean(f.isUnderline),
            };
          }),
        },
      },
      include: { fields: true },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    console.error("Lỗi lưu template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// API Lấy danh sách tất cả các mẫu đã lưu
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      include: { fields: true },
      orderBy: { createdAt: 'desc' }, // Mẫu mới tạo hiển thị lên đầu
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}