import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface SaveHistoryRequest {
  koreanText: string;
  englishText: string;
  editedEnglishText?: string;
}

interface Translation {
  id: number;
  korean_text: string;
  english_text: string;
  edited_english_text: string | null;
  is_edited: number;
  created_at: string;
  updated_at: string;
}

// Save translation to history
export async function POST(request: NextRequest) {
  try {
    const { koreanText, englishText, editedEnglishText }: SaveHistoryRequest =
      await request.json();

    // Get D1 database binding from Cloudflare env
    const env = process.env as unknown as CloudflareEnv;
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { error: 'D1 데이터베이스가 바인딩되지 않았습니다.' },
        { status: 500 }
      );
    }

    const isEdited = editedEnglishText && editedEnglishText !== englishText;

    const result = await db
      .prepare(
        `INSERT INTO translations
        (korean_text, english_text, edited_english_text, is_edited)
        VALUES (?, ?, ?, ?)`
      )
      .bind(
        koreanText,
        englishText,
        editedEnglishText || null,
        isEdited ? 1 : 0
      )
      .run();

    return NextResponse.json({
      id: result.meta.last_row_id,
      success: true,
    });
  } catch (error) {
    console.error('Save history error:', error);
    return NextResponse.json(
      { error: '히스토리 저장 실패' },
      { status: 500 }
    );
  }
}

// Get translation history with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = 20;

    const env = process.env as unknown as CloudflareEnv;
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { error: 'D1 데이터베이스가 바인딩되지 않았습니다.' },
        { status: 500 }
      );
    }

    const { results } = await db
      .prepare(
        `SELECT * FROM translations
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();

    return NextResponse.json({ translations: results as unknown as Translation[] });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: '히스토리 조회 실패' },
      { status: 500 }
    );
  }
}

// Delete translation by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const env = process.env as unknown as CloudflareEnv;
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { error: 'D1 데이터베이스가 바인딩되지 않았습니다.' },
        { status: 500 }
      );
    }

    await db
      .prepare('DELETE FROM translations WHERE id = ?')
      .bind(id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete history error:', error);
    return NextResponse.json(
      { error: '삭제 실패' },
      { status: 500 }
    );
  }
}
