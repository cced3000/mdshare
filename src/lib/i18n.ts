export type Language = "en" | "zh" | "ja";
export type ShareStatus = "available" | "expired" | "burned" | "deleted";
export type EditableModeValue = "READ_ONLY" | "EDIT_LINK";
export type BurnModeValue =
  | "OFF"
  | "AFTER_FIRST_VIEW_GRACE"
  | "AFTER_FIRST_VIEW_INSTANT";

export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGE_STORAGE_KEY = "mdshare:language:v1";

export const LANGUAGE_OPTIONS = [
  { value: "en", labelKey: "lang.en" },
  { value: "zh", labelKey: "lang.zh" },
  { value: "ja", labelKey: "lang.ja" },
] as const;

const translations = {
  en: {
    "brand.backHome": "Go back home",
    "lang.en": "English",
    "lang.zh": "中文",
    "lang.ja": "日本語",
    "footer.language": "Language",
    "common.markdown": "Markdown",
    "common.preview": "Preview",
    "common.displayMode": "Display mode",
    "common.back": "Back",
    "common.open": "Open",
    "common.close": "Close",
    "common.copied": "Copied",
    "common.copyTypography": "Copy formatted text",
    "common.expiresAt": "Expires {date}",
    "common.createdAt": "Created {date}",
    "common.readOnly": "Read-only",
    "common.editLinkAccess": "Editable via edit link",
    "status.available": "Available",
    "status.expired": "Expired",
    "status.burned": "Burned",
    "status.deleted": "Deleted",
    "markdown.emptyPreview":
      "Markdown preview appears here in real time and automatically improves CJK typography.",
    "password.show": "Show password",
    "password.hide": "Hide password",
    "home.note": "Temporary Markdown sharing",
    "home.upload": "Upload",
    "home.createShare": "Create share",
    "home.placeholder": "Paste Markdown here",
    "home.statsChars": "{count} chars",
    "home.fileTooLarge": "Files must be smaller than {size} KB.",
    "home.shareSettings": "Share settings",
    "home.expiry": "Expiry",
    "home.passwordAccess": "Password protection",
    "home.passwordPlaceholder": "Leave blank for no password",
    "home.burnMode": "Burn after reading",
    "home.editPermissions": "Editing permissions",
    "home.creating": "Creating...",
    "home.createShareLink": "Create share link",
    "home.resultTitle": "Share link created",
    "home.summaryIncludesEditLink": "Includes edit link",
    "home.summaryReadOnlyShare": "Read-only share",
    "home.accessLink": "Access link",
    "home.copyAccessLink": "Copy access link",
    "home.editLink": "Edit link",
    "home.copyEditLink": "Copy edit link",
    "home.manageLink": "Management link",
    "home.copyManageLink": "Copy management link",
    "home.manageHint":
      "The management link is one of your only credentials for editing, extending, or deleting this share anonymously. Keep it safe.",
    "home.emptyResultTitle": "Your share links appear here after creation",
    "home.emptyResultSubtitle": "Adjust the options on the left, then create a link.",
    "home.emptyTagAccess": "Access link",
    "home.emptyTagEdit": "Edit link",
    "home.emptyTagManage": "Management link",
    "home.emptyHint": "Links appear here after creation and support one-click copying.",
    "manage.note.owner": "Management mode",
    "manage.note.editor": "Edit mode",
    "manage.loading": "Loading management workspace...",
    "manage.unableToOpen": "Cannot open this editor",
    "manage.previewPublic": "Open public preview",
    "manage.linkAndSettings": "Links & settings",
    "manage.linkInfo": "Link info",
    "manage.remoteConflictTitle": "Remote changes detected",
    "manage.remoteConflictBody":
      "Someone else updated this content. You can overwrite the remote version or copy and merge manually.",
    "manage.forceSave": "Overwrite and save",
    "manage.autoSaving": "Autosaving...",
    "manage.autoSaveEnabled": "Autosave is on",
    "manage.infoAutoSaved": "Autosaved · {date}",
    "manage.settingsSaved": "Share settings updated.",
    "manage.newEditLinkCopied": "A new edit link was generated and copied.",
    "manage.confirmDelete":
      "Delete this share? The public link will stop working immediately.",
    "manage.shareSettings": "Share settings",
    "manage.resetPassword": "Reset password",
    "manage.resetPasswordPlaceholder": "Leave blank to disable password",
    "manage.saveShareSettings": "Save share settings",
    "manage.saving": "Saving...",
    "manage.deleteShare": "Delete share",
    "manage.currentEditLink": "Current edit link",
    "manage.currentManageLink": "Current management link",
    "manage.noBurn": "No burn after reading",
    "manage.burnEnabled": "Burn after reading",
    "manage.settings": "Settings",
    "public.note.readOnly": "Read-only access",
    "public.note.protected": "Protected access",
    "public.state.expired": "This share link has expired.",
    "public.state.burned": "This content has been burned and cannot be opened again.",
    "public.state.deleted": "This content has been deleted.",
    "public.state.notFound": "No share was found for this link.",
    "public.linkUnavailable": "Link unavailable",
    "public.backHome": "Back to home",
    "public.passwordRequired": "Password required",
    "public.burnConfirmationRequired": "Burn confirmation required",
    "public.gatedCopy": "The content opens here after verification. This page does not redirect.",
    "public.enterPassword": "Enter access password",
    "public.passwordPlaceholder": "Password",
    "public.burnTitle": "Burn after reading is enabled",
    "public.burnBody":
      "Confirmation starts the burn flow. Bot previews do not burn the share automatically.",
    "public.preparing": "Preparing...",
    "public.viewContent": "View content",
    "public.copyMarkdown": "Copy Markdown",
    "public.downloadMd": "Download .md",
    "public.emptyContent": "This share has no content yet.",
    "public.statusLine": "Expires: {absolute} · {relative}",
    "loading.preparing": "Preparing content",
    "loading.readingShare": "Loading shared content",
    "editable.readOnly": "Read-only",
    "editable.editLink": "Editable with edit link",
    "burn.off": "Off",
    "burn.grace": "Burn 10 minutes after first view",
    "burn.instant": "Expire immediately after first view",
    "expiry.1h": "1 hour",
    "expiry.24h": "1 day",
    "expiry.168h": "7 days",
    "expiry.720h": "30 days",
    "error.databaseNotReady":
      "The database is not initialized yet. Run `pnpm run db:migrate:local` locally, or `pnpm run db:migrate` for Cloudflare.",
    "error.databaseBindingMissing":
      "The Cloudflare D1 `DB` binding is missing. Check `wrangler.toml` and the current environment bindings.",
    "error.invalidRequest": "Invalid request payload.",
    "error.unauthorized": "Unauthorized.",
    "error.enterMarkdown": "Please enter Markdown content first.",
    "error.invalidPassword": "The password is incorrect.",
    "error.missingToken": "This link is missing a management or edit token.",
    "error.invalidToken": "The token is invalid.",
    "error.shareMissing": "This share does not exist or has already been deleted.",
    "error.readFailed": "Failed to load the share.",
    "error.createFailed": "Failed to create the share.",
    "error.saveFailed": "Failed to save the content.",
    "error.saveSettingsFailed": "Failed to save share settings.",
    "error.deleteFailed": "Failed to delete the share.",
    "error.emptyContent": "Content cannot be empty.",
    "error.ownerOnlySettings": "Only the management link can update share settings.",
    "error.ownerOnlyDelete": "Only the management link can delete the share.",
    "error.markdownTooLarge": "Markdown must be smaller than {size} KB.",
    "error.cleanupFailed": "Cleanup failed.",
  },
  zh: {
    "brand.backHome": "返回首页",
    "lang.en": "English",
    "lang.zh": "中文",
    "lang.ja": "日本語",
    "footer.language": "界面语言",
    "common.markdown": "Markdown",
    "common.preview": "预览",
    "common.displayMode": "显示模式",
    "common.back": "返回",
    "common.open": "打开",
    "common.close": "关闭",
    "common.copied": "已复制",
    "common.copyTypography": "复制排版",
    "common.expiresAt": "到期 {date}",
    "common.createdAt": "创建于 {date}",
    "common.readOnly": "只读",
    "common.editLinkAccess": "持有编辑链接可编辑",
    "status.available": "可用",
    "status.expired": "已过期",
    "status.burned": "已焚毁",
    "status.deleted": "已删除",
    "markdown.emptyPreview": "这里会实时渲染 Markdown 预览，并自动优化中日韩排版。",
    "password.show": "显示密码",
    "password.hide": "隐藏密码",
    "home.note": "临时 Markdown 分享",
    "home.upload": "上传",
    "home.createShare": "创建分享",
    "home.placeholder": "把 Markdown 贴到这里",
    "home.statsChars": "{count} 字符",
    "home.fileTooLarge": "文件不能超过 {size} KB。",
    "home.shareSettings": "分享设置",
    "home.expiry": "有效期",
    "home.passwordAccess": "密码访问",
    "home.passwordPlaceholder": "留空表示无需密码",
    "home.burnMode": "阅后即焚",
    "home.editPermissions": "编辑权限",
    "home.creating": "正在创建...",
    "home.createShareLink": "创建分享链接",
    "home.resultTitle": "分享链接已创建",
    "home.summaryIncludesEditLink": "含编辑链接",
    "home.summaryReadOnlyShare": "只读分享",
    "home.accessLink": "访问链接",
    "home.copyAccessLink": "复制访问链接",
    "home.editLink": "编辑链接",
    "home.copyEditLink": "复制编辑链接",
    "home.manageLink": "管理链接",
    "home.copyManageLink": "复制管理链接",
    "home.manageHint":
      "管理链接是匿名模式下继续修改、延长有效期或删除内容的重要凭证之一，请妥善保存。",
    "home.emptyResultTitle": "创建后在这里查看分享链接",
    "home.emptyResultSubtitle": "设置左侧选项，点击创建按钮即可生成。",
    "home.emptyTagAccess": "访问链接",
    "home.emptyTagEdit": "编辑链接",
    "home.emptyTagManage": "管理链接",
    "home.emptyHint": "链接创建后将在此处显示，支持一键复制。",
    "manage.note.owner": "管理模式",
    "manage.note.editor": "编辑模式",
    "manage.loading": "正在加载管理界面...",
    "manage.unableToOpen": "无法打开编辑页",
    "manage.previewPublic": "预览公开页",
    "manage.linkAndSettings": "链接与设置",
    "manage.linkInfo": "链接信息",
    "manage.remoteConflictTitle": "检测到远端更新",
    "manage.remoteConflictBody": "有人已经改动了这份内容。你可以覆盖远端版本，或手动复制并合并。",
    "manage.forceSave": "覆盖保存",
    "manage.autoSaving": "正在自动保存...",
    "manage.autoSaveEnabled": "已开启自动保存",
    "manage.infoAutoSaved": "已自动保存 · {date}",
    "manage.settingsSaved": "分享设置已更新。",
    "manage.newEditLinkCopied": "已生成新的编辑链接并复制到剪贴板。",
    "manage.confirmDelete": "确认删除这份分享？删除后访问链接会立即失效。",
    "manage.shareSettings": "分享设置",
    "manage.resetPassword": "重设密码",
    "manage.resetPasswordPlaceholder": "留空表示关闭密码",
    "manage.saveShareSettings": "保存分享设置",
    "manage.saving": "保存中...",
    "manage.deleteShare": "删除分享",
    "manage.currentEditLink": "当前编辑链接",
    "manage.currentManageLink": "当前管理链接",
    "manage.noBurn": "不焚毁",
    "manage.burnEnabled": "阅后即焚",
    "manage.settings": "设置",
    "public.note.readOnly": "只读访问",
    "public.note.protected": "受保护访问",
    "public.state.expired": "这个分享链接已经过期。",
    "public.state.burned": "这份内容已经焚毁，无法再次访问。",
    "public.state.deleted": "这份内容已经被删除。",
    "public.state.notFound": "没有找到对应的分享内容。",
    "public.linkUnavailable": "链接不可用",
    "public.backHome": "返回首页",
    "public.passwordRequired": "需要密码",
    "public.burnConfirmationRequired": "确认查看后销毁",
    "public.gatedCopy": "验证通过后直接显示正文，页面不会跳转。",
    "public.enterPassword": "输入访问密码",
    "public.passwordPlaceholder": "Password",
    "public.burnTitle": "阅后即焚已开启",
    "public.burnBody": "确认查看后会开始销毁流程，机器人预览不会直接触发焚毁。",
    "public.preparing": "正在准备内容...",
    "public.viewContent": "查看内容",
    "public.copyMarkdown": "复制 Markdown",
    "public.downloadMd": "下载 .md",
    "public.emptyContent": "这份分享还没有正文。",
    "public.statusLine": "到期时间：{absolute} · {relative}",
    "loading.preparing": "正在准备内容",
    "loading.readingShare": "正在读取分享内容",
    "editable.readOnly": "只读",
    "editable.editLink": "持有编辑链接可编辑",
    "burn.off": "关闭",
    "burn.grace": "首次查看后 10 分钟销毁",
    "burn.instant": "首次查看后立即失效",
    "expiry.1h": "1 小时",
    "expiry.24h": "1 天",
    "expiry.168h": "7 天",
    "expiry.720h": "30 天",
    "error.databaseNotReady":
      "数据库尚未初始化。请先运行本地迁移 `pnpm run db:migrate:local`；如果是线上环境，请运行 `pnpm run db:migrate`。",
    "error.databaseBindingMissing":
      "未检测到 Cloudflare D1 的 `DB` 绑定。请确认当前环境已按 `wrangler.toml` 正确注入数据库绑定。",
    "error.invalidRequest": "请求参数无效。",
    "error.unauthorized": "未授权。",
    "error.enterMarkdown": "请先输入 Markdown 内容。",
    "error.invalidPassword": "访问密码不正确。",
    "error.missingToken": "链接缺少管理令牌或编辑令牌。",
    "error.invalidToken": "令牌无效。",
    "error.shareMissing": "分享不存在或已删除。",
    "error.readFailed": "读取失败。",
    "error.createFailed": "创建失败。",
    "error.saveFailed": "保存失败。",
    "error.saveSettingsFailed": "保存设置失败。",
    "error.deleteFailed": "删除失败。",
    "error.emptyContent": "内容不能为空。",
    "error.ownerOnlySettings": "只有管理链接可以修改分享设置。",
    "error.ownerOnlyDelete": "只有管理链接可以删除分享。",
    "error.markdownTooLarge": "Markdown 文件不能超过 {size} KB。",
    "error.cleanupFailed": "清理失败。",
  },
  ja: {
    "brand.backHome": "ホームに戻る",
    "lang.en": "English",
    "lang.zh": "中文",
    "lang.ja": "日本語",
    "footer.language": "表示言語",
    "common.markdown": "Markdown",
    "common.preview": "プレビュー",
    "common.displayMode": "表示モード",
    "common.back": "戻る",
    "common.open": "開く",
    "common.close": "閉じる",
    "common.copied": "コピーしました",
    "common.copyTypography": "整形済みテキストをコピー",
    "common.expiresAt": "{date} に期限切れ",
    "common.createdAt": "{date} に作成",
    "common.readOnly": "読み取り専用",
    "common.editLinkAccess": "編集リンク所持者は編集可能",
    "status.available": "利用可能",
    "status.expired": "期限切れ",
    "status.burned": "焼却済み",
    "status.deleted": "削除済み",
    "markdown.emptyPreview":
      "Markdown プレビューがここにリアルタイム表示され、中日韓組版も自動で整えます。",
    "password.show": "パスワードを表示",
    "password.hide": "パスワードを非表示",
    "home.note": "一時的な Markdown 共有",
    "home.upload": "アップロード",
    "home.createShare": "共有を作成",
    "home.placeholder": "ここに Markdown を貼り付け",
    "home.statsChars": "{count} 文字",
    "home.fileTooLarge": "ファイルサイズは {size} KB 未満である必要があります。",
    "home.shareSettings": "共有設定",
    "home.expiry": "有効期限",
    "home.passwordAccess": "パスワード保護",
    "home.passwordPlaceholder": "空欄でパスワードなし",
    "home.burnMode": "閲覧後に焼却",
    "home.editPermissions": "編集権限",
    "home.creating": "作成中...",
    "home.createShareLink": "共有リンクを作成",
    "home.resultTitle": "共有リンクを作成しました",
    "home.summaryIncludesEditLink": "編集リンク付き",
    "home.summaryReadOnlyShare": "読み取り専用共有",
    "home.accessLink": "閲覧リンク",
    "home.copyAccessLink": "閲覧リンクをコピー",
    "home.editLink": "編集リンク",
    "home.copyEditLink": "編集リンクをコピー",
    "home.manageLink": "管理リンク",
    "home.copyManageLink": "管理リンクをコピー",
    "home.manageHint":
      "管理リンクは、匿名のまま編集・延長・削除を続けるための重要な認証情報のひとつです。安全に保管してください。",
    "home.emptyResultTitle": "作成後、共有リンクがここに表示されます",
    "home.emptyResultSubtitle": "左側の設定を選んで、作成ボタンを押してください。",
    "home.emptyTagAccess": "閲覧リンク",
    "home.emptyTagEdit": "編集リンク",
    "home.emptyTagManage": "管理リンク",
    "home.emptyHint": "リンクは作成後ここに表示され、ワンクリックでコピーできます。",
    "manage.note.owner": "管理モード",
    "manage.note.editor": "編集モード",
    "manage.loading": "管理画面を読み込み中...",
    "manage.unableToOpen": "編集ページを開けません",
    "manage.previewPublic": "公開ページを開く",
    "manage.linkAndSettings": "リンクと設定",
    "manage.linkInfo": "リンク情報",
    "manage.remoteConflictTitle": "リモート更新を検出しました",
    "manage.remoteConflictBody":
      "他のユーザーがこの内容を更新しました。上書き保存するか、手動でコピーしてマージできます。",
    "manage.forceSave": "上書き保存",
    "manage.autoSaving": "自動保存中...",
    "manage.autoSaveEnabled": "自動保存は有効です",
    "manage.infoAutoSaved": "自動保存済み · {date}",
    "manage.settingsSaved": "共有設定を更新しました。",
    "manage.newEditLinkCopied": "新しい編集リンクを生成し、クリップボードにコピーしました。",
    "manage.confirmDelete": "この共有を削除しますか？公開リンクはすぐに無効になります。",
    "manage.shareSettings": "共有設定",
    "manage.resetPassword": "パスワードを再設定",
    "manage.resetPasswordPlaceholder": "空欄でパスワードを無効化",
    "manage.saveShareSettings": "共有設定を保存",
    "manage.saving": "保存中...",
    "manage.deleteShare": "共有を削除",
    "manage.currentEditLink": "現在の編集リンク",
    "manage.currentManageLink": "現在の管理リンク",
    "manage.noBurn": "焼却しない",
    "manage.burnEnabled": "閲覧後に焼却",
    "manage.settings": "設定",
    "public.note.readOnly": "読み取り専用アクセス",
    "public.note.protected": "保護されたアクセス",
    "public.state.expired": "この共有リンクは期限切れです。",
    "public.state.burned": "この内容は焼却済みのため、再度開けません。",
    "public.state.deleted": "この内容は削除されました。",
    "public.state.notFound": "このリンクに対応する共有が見つかりませんでした。",
    "public.linkUnavailable": "リンクを利用できません",
    "public.backHome": "ホームに戻る",
    "public.passwordRequired": "パスワードが必要です",
    "public.burnConfirmationRequired": "閲覧前の確認が必要です",
    "public.gatedCopy": "認証後、この場で本文を表示します。ページ遷移はありません。",
    "public.enterPassword": "アクセス用パスワードを入力",
    "public.passwordPlaceholder": "Password",
    "public.burnTitle": "閲覧後焼却が有効です",
    "public.burnBody": "確認すると焼却フローが始まります。ボットのプレビューでは自動焼却されません。",
    "public.preparing": "準備中...",
    "public.viewContent": "本文を見る",
    "public.copyMarkdown": "Markdown をコピー",
    "public.downloadMd": ".md をダウンロード",
    "public.emptyContent": "この共有にはまだ本文がありません。",
    "public.statusLine": "有効期限: {absolute} · {relative}",
    "loading.preparing": "内容を準備中",
    "loading.readingShare": "共有内容を読み込み中",
    "editable.readOnly": "読み取り専用",
    "editable.editLink": "編集リンクで編集可能",
    "burn.off": "オフ",
    "burn.grace": "初回閲覧の 10 分後に焼却",
    "burn.instant": "初回閲覧直後に無効化",
    "expiry.1h": "1 時間",
    "expiry.24h": "1 日",
    "expiry.168h": "7 日",
    "expiry.720h": "30 日",
    "error.databaseNotReady":
      "データベースがまだ初期化されていません。ローカルでは `pnpm run db:migrate:local`、Cloudflare では `pnpm run db:migrate` を実行してください。",
    "error.databaseBindingMissing":
      "Cloudflare D1 の `DB` バインディングが見つかりません。`wrangler.toml` と現在の環境設定を確認してください。",
    "error.invalidRequest": "リクエスト内容が不正です。",
    "error.unauthorized": "認証されていません。",
    "error.enterMarkdown": "先に Markdown 内容を入力してください。",
    "error.invalidPassword": "パスワードが正しくありません。",
    "error.missingToken": "このリンクには管理または編集トークンがありません。",
    "error.invalidToken": "トークンが無効です。",
    "error.shareMissing": "この共有は存在しないか、すでに削除されています。",
    "error.readFailed": "読み込みに失敗しました。",
    "error.createFailed": "共有の作成に失敗しました。",
    "error.saveFailed": "保存に失敗しました。",
    "error.saveSettingsFailed": "共有設定の保存に失敗しました。",
    "error.deleteFailed": "削除に失敗しました。",
    "error.emptyContent": "内容は空にできません。",
    "error.ownerOnlySettings": "共有設定を変更できるのは管理リンクだけです。",
    "error.ownerOnlyDelete": "共有を削除できるのは管理リンクだけです。",
    "error.markdownTooLarge": "Markdown は {size} KB 未満である必要があります。",
    "error.cleanupFailed": "クリーンアップに失敗しました。",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

export function isLanguage(value: string | null | undefined): value is Language {
  return value === "en" || value === "zh" || value === "ja";
}

export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
) {
  const dictionary = translations[language] ?? translations[DEFAULT_LANGUAGE];
  return interpolate(dictionary[key] ?? translations[DEFAULT_LANGUAGE][key], params);
}

export function getLocaleForLanguage(language: Language) {
  switch (language) {
    case "zh":
      return "zh-CN";
    case "ja":
      return "ja-JP";
    default:
      return "en-US";
  }
}

export function getHtmlLang(language: Language) {
  return getLocaleForLanguage(language);
}

export function getExpiryOptionLabel(language: Language, hours: number) {
  const key =
    hours === 1
      ? "expiry.1h"
      : hours === 24
        ? "expiry.24h"
        : hours === 24 * 7
          ? "expiry.168h"
          : "expiry.720h";

  return translate(language, key);
}

export function getBurnModeLabel(language: Language, burnMode: BurnModeValue) {
  if (burnMode === "AFTER_FIRST_VIEW_GRACE") {
    return translate(language, "burn.grace");
  }

  if (burnMode === "AFTER_FIRST_VIEW_INSTANT") {
    return translate(language, "burn.instant");
  }

  return translate(language, "burn.off");
}

export function getEditableModeLabel(language: Language, editableMode: EditableModeValue) {
  return editableMode === "EDIT_LINK"
    ? translate(language, "editable.editLink")
    : translate(language, "editable.readOnly");
}

export function getShareStatusLabel(language: Language, status: ShareStatus) {
  if (status === "expired") {
    return translate(language, "status.expired");
  }

  if (status === "burned") {
    return translate(language, "status.burned");
  }

  if (status === "deleted") {
    return translate(language, "status.deleted");
  }

  return translate(language, "status.available");
}

export function getStarterMarkdown(language: Language) {
  if (language === "zh") {
    return `# 即贴即分享

把 Markdown 贴进来，右侧会即时渲染，并自动优化中文阅读排版。

## 这份服务适合

- 会议纪要、临时说明和 24 小时内有效的通知
- 带密码的 Markdown 文档分享
- 需要只读链接或编辑链接的协作草稿
- 一次性公告、日报与 AI 生成内容校对

> 无需注册，创建后立刻拿到访问链接。`;
  }

  if (language === "ja") {
    return `# Paste, share, done

Markdown を貼り付けると、右側に即時プレビューが表示され、読みやすい CJK 組版に整えます。

## こんな用途に向いています

- 会議メモや一時的なお知らせの共有
- パスワード付き Markdown ドキュメント
- 閲覧リンクと編集リンクを分けたい下書き
- 単発の告知、日報、AI 生成文の校正

> 登録は不要です。作成後すぐに共有リンクを受け取れます。`;
  }

  return `# Paste and share instantly

Drop your Markdown here to render a live preview and keep CJK typography readable.

## Great for

- meeting notes, temporary instructions, and short-lived updates
- password-protected Markdown documents
- collaboration drafts with separate read and edit links
- one-off announcements, daily reports, and AI output review

> No sign-up required. Create a link and share it immediately.`;
}

export function localizeErrorMessage(
  language: Language,
  message: string,
  fallbackKey?: TranslationKey,
) {
  const normalized = message.toLowerCase();
  const sizeMatch = message.match(/(\d+)\s*kb/i);

  if (
    normalized.includes("no such table: shares") ||
    normalized.includes("no such table: share_views") ||
    normalized.includes("数据库尚未初始化") ||
    normalized.includes("database is not initialized")
  ) {
    return translate(language, "error.databaseNotReady");
  }

  if (
    normalized.includes("unable to find cloudflare d1 binding 'db'") ||
    normalized.includes("未检测到 cloudflare d1") ||
    normalized.includes("binding is missing")
  ) {
    return translate(language, "error.databaseBindingMissing");
  }

  if (normalized.includes("请先输入 markdown 内容") || normalized.includes("please enter markdown")) {
    return translate(language, "error.enterMarkdown");
  }

  if (normalized.includes("访问密码不正确") || normalized.includes("password is incorrect")) {
    return translate(language, "error.invalidPassword");
  }

  if (
    normalized.includes("链接缺少管理令牌或编辑令牌") ||
    normalized.includes("缺少访问令牌") ||
    normalized.includes("missing a management or edit token")
  ) {
    return translate(language, "error.missingToken");
  }

  if (normalized.includes("令牌无效") || normalized.includes("token is invalid")) {
    return translate(language, "error.invalidToken");
  }

  if (
    normalized.includes("分享不存在或已删除") ||
    normalized.includes("does not exist or has already been deleted")
  ) {
    return translate(language, "error.shareMissing");
  }

  if (normalized.includes("读取失败") || normalized.includes("failed to load")) {
    return translate(language, "error.readFailed");
  }

  if (normalized.includes("创建失败") || normalized.includes("failed to create")) {
    return translate(language, "error.createFailed");
  }

  if (
    normalized.includes("保存设置失败") ||
    normalized.includes("failed to save share settings")
  ) {
    return translate(language, "error.saveSettingsFailed");
  }

  if (normalized.includes("保存失败") || normalized.includes("failed to save")) {
    return translate(language, "error.saveFailed");
  }

  if (normalized.includes("删除失败") || normalized.includes("failed to delete")) {
    return translate(language, "error.deleteFailed");
  }

  if (normalized.includes("内容不能为空") || normalized.includes("content cannot be empty")) {
    return translate(language, "error.emptyContent");
  }

  if (
    normalized.includes("只有管理链接可以修改分享设置") ||
    normalized.includes("only the management link can update share settings")
  ) {
    return translate(language, "error.ownerOnlySettings");
  }

  if (
    normalized.includes("只有管理链接可以删除分享") ||
    normalized.includes("only the management link can delete the share")
  ) {
    return translate(language, "error.ownerOnlyDelete");
  }

  if (
    normalized.includes("markdown 文件不能超过") ||
    normalized.includes("markdown must be smaller than")
  ) {
    return translate(language, "error.markdownTooLarge", {
      size: sizeMatch?.[1] ?? 512,
    });
  }

  if (fallbackKey) {
    return translate(language, fallbackKey);
  }

  return message;
}
