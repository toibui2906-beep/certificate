import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. API Lấy chi tiết 1 template theo ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: "Không tìm thấy mẫu chứng chỉ" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    console.error("Lỗi lấy chi tiết template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. API Cập nhật template theo ID (Thêm mới)
// API Cập nhật Template và các Fields đi kèm
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // 1. Kiểm tra xem template có tồn tại không
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy mẫu chứng chỉ để cập nhật" },
        { status: 404 }
      );
    }

    // 2. Sử dụng Transaction để thực hiện đồng thời cập nhật Template và Fields
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // Cập nhật thông tin chính của Template
      const template = await tx.template.update({
        where: { id },
        data: {
          name: body.name,
          bgImage: body.bgImage,
          width: body.width,
          height: body.height,
        },
      });

      // Nếu client có gửi danh sách fields lên, ta tiến hành đồng bộ lại fields
      if (body.fields && Array.isArray(body.fields)) {
        // Cách an toàn & nhanh nhất: Xóa toàn bộ các field cũ của template này...
        await tx.templateField.deleteMany({
          where: { templateId: id },
        });

        // ...sau đó tạo mới lại toàn bộ danh sách fields từ dữ liệu client gửi lên
        if (body.fields.length > 0) {
          await tx.templateField.createMany({
            data: body.fields.map((field: any) => {
              const posXPercent = Number(field.posXPercent ?? field.xPercent);
              const posYPercent = Number(field.posYPercent ?? field.yPercent);

              return {
                templateId: id,
                type: field.type ?? "dynamic",
                excelColumn: field.excelColumn ?? null,
                textContent: field.textContent ?? null,
                posXPercent: Number.isFinite(posXPercent) ? posXPercent : 0,
                posYPercent: Number.isFinite(posYPercent) ? posYPercent : 0,
                fontSize: field.fontSize ?? 24,
                color: field.color ?? "#000000",
                fontFamily: field.fontFamily ?? "Times New Roman",
                isBold: field.isBold ?? false,
                isItalic: field.isItalic ?? false,
                isUnderline: field.isUnderline ?? false,
                textAlign: field.textAlign ?? "center",
              };
            }),
          });
        }
      }

      // Trả về template kèm theo fields mới nhất sau khi cập nhật
      return await tx.template.findUnique({
        where: { id },
        include: { fields: true },
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: "Cập nhật mẫu và các trường thành công",
    });
  } catch (error: any) {
    console.error("Lỗi khi cập nhật template và fields:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 3. API Xóa template theo ID
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID của mẫu cần xóa" }, { status: 400 });
    }

    await prisma.template.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Xóa mẫu thành công" });
  } catch (error: any) {
    console.error("Lỗi khi xóa template:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}