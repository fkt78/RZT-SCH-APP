/**
 * Firebase Cloud Functions — 体力測定 AI 分析（OpenAI はサーバー側のみ）
 */
require("dotenv").config();

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const REGION = "asia-northeast1";
const MAX_DATA_TEXT_LENGTH = 64000;

const SYSTEM_PROMPT = `あなたは児童・生徒の体力測定を分析し、その結果を**お母さん（保護者）に渡す文章**を書く専門家です。読み手は「わが子の様子を知りたいお母さん」です。お母さんが読んで「この子、ここ伸びてるんだな」「ここはこれからだな」と、**感情的にすっと伝わる・心に残る**文章にしてください。EQを高く、子どもに寄り添い、お母さんにも寄り添うトーンで書いてください。

【誰のための文章か】
・この分析は**お母さんに見せる**ためのものです。お母さんが「うれしい」「安心した」「ここを応援してあげよう」と自然に思えるように、種目ごとの「伸びているところ」と「もう少し伸ばしたいところ」が感情的に伝わるように書いてください。

【最重要：平均値と測定値は別物】
・**平均**＝同年代平均＝「その学年・年代の参考値」であり、**その子の過去の値ではない**。
・**今回**＝本人の測定値＝「その子自身がその回に計った値」だけを指す。成長や「伸びた」を語るときに使ってよいのは**この「今回」の時系列だけ**です。
・「伸びている」「○cm伸びた」は、**必ず「今回」だけ**を比較して書く。本人の測定値どうしの差だけ。`;

exports.generateFitnessAnalysis = onCall(
  {
    region: REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。アプリから再度ログインしてください。");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || String(apiKey).trim() === "") {
      logger.error("OPENAI_API_KEY is missing or empty");
      throw new HttpsError(
        "failed-precondition",
        "サーバーに OpenAI API キーが設定されていません。functions/.env または本番環境の環境変数を確認してください。"
      );
    }

    const payload = request.data;
    if (!payload || typeof payload !== "object") {
      throw new HttpsError("invalid-argument", "リクエストデータが不正です。");
    }

    const dataText =
      typeof payload.dataText === "string" ? payload.dataText.trim() : "";
    if (!dataText) {
      throw new HttpsError("invalid-argument", "分析するデータ（dataText）が空です。");
    }
    if (dataText.length > MAX_DATA_TEXT_LENGTH) {
      throw new HttpsError(
        "invalid-argument",
        `分析データが長すぎます（最大 ${MAX_DATA_TEXT_LENGTH} 文字）。`
      );
    }

    const studentName =
      typeof payload.studentName === "string" ? payload.studentName.trim() : "";
    const schoolYear =
      typeof payload.schoolYear === "number" && Number.isFinite(payload.schoolYear)
        ? payload.schoolYear
        : null;
    const grade =
      typeof payload.grade === "string" ? payload.grade.trim() : "";

    logger.info("generateFitnessAnalysis", {
      uid: request.auth.uid,
      studentName: studentName || "(empty)",
      schoolYear,
      grade: grade || "(empty)",
      dataTextLength: dataText.length,
    });

    let userContent = dataText;
    if (studentName || schoolYear != null || grade) {
      const meta = [];
      if (studentName) meta.push(`生徒名: ${studentName}`);
      if (schoolYear != null) meta.push(`年度: ${schoolYear}`);
      if (grade) meta.push(`学年: ${grade}`);
      userContent = `${meta.join(" / ")}\n\n${dataText}`;
    }

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      const json = await res.json().catch((e) => {
        logger.error("OpenAI response JSON parse error", e);
        return null;
      });

      if (res.ok && (!json || typeof json !== "object")) {
        logger.error("OpenAI returned OK but invalid JSON body");
        throw new HttpsError(
          "internal",
          "AI分析サービスからの応答を解析できませんでした。"
        );
      }

      if (!res.ok) {
        const msg =
          json?.error?.message ||
          `OpenAI HTTP ${res.status} ${res.statusText || ""}`.trim();
        logger.error("OpenAI API error", { status: res.status, body: json });
        throw new HttpsError(
          "internal",
          `AI分析サービスがエラーを返しました: ${msg}`
        );
      }

      if (json.error) {
        logger.error("OpenAI error object", json.error);
        throw new HttpsError(
          "internal",
          `AI分析エラー: ${json.error.message || "不明なエラー"}`
        );
      }

      const text = json.choices?.[0]?.message?.content?.trim();
      const analysisText = text || "分析結果を取得できませんでした。";

      return { analysisText };
    } catch (err) {
      if (err instanceof HttpsError) {
        throw err;
      }
      logger.error("generateFitnessAnalysis failed", err);
      const message =
        err && typeof err.message === "string"
          ? err.message
          : "AI分析の実行に失敗しました。";
      throw new HttpsError(
        "internal",
        `AI分析に失敗しました: ${message}`
      );
    }
  }
);
