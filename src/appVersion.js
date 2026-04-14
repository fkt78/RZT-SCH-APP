import packageInfo from '../package.json';

/**
 * アプリのバージョン表記
 *
 * - メジャー・マイナー・パッチ … package.json の "version"（semver）。
 *   変更は `npm run version:patch` / `version:minor` / `version:major` で行う。
 * - デプロイ日 … `vite build` または `vite` 起動時に YYYY-MM-DD で埋め込み（そのビルドの日付）。
 */
export const APP_SEMVER = packageInfo.version;

/** ビルド時に決まる日付（YYYY-MM-DD）。Vite の define で注入 */
export const APP_DEPLOY_DATE = import.meta.env.VITE_DEPLOY_DATE ?? '';

/** ヘッダー・ログイン画面などへの表示用（例: v1.1.0 · 2026-04-09） */
export const APP_VERSION_LABEL =
  APP_DEPLOY_DATE !== ''
    ? `v${APP_SEMVER} · ${APP_DEPLOY_DATE}`
    : `v${APP_SEMVER}`;
