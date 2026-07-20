import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Hello Again",
  description: "How the Hello Again prototype handles personal data.",
};

const englishSections = [
  ["1. Operator and scope", "Hello Again is an experimental hackathon prototype operated by its individual creator, Fumiya. This policy explains how data is handled when you use the service."],
  ["2. Data we handle", "We may handle your profile name, name pronunciation, organization, avatar, verified email, device session token, exchange history, one-time location snapshots, private notes about exchanged contacts, AI-extracted facts and visual traits, and saved AI-generated images."],
  ["3. Purposes", "We use this data to restore accounts, exchange profiles, show exchanged friends near a voluntarily registered point, organize private memory notes, generate fictional memory images, operate and secure the service, investigate failures, and comply with law."],
  ["4. Location", "Location is collected only after you tap a location or exchange action and allow browser access. It is a snapshot, not continuous background tracking. A registered point stops being used for nearby matching after one hour. Friends see only the nearby result—not your coordinates or exact location."],
  ["5. AI and external processors", "Written notes may be sent to the OpenAI API to structure explicitly stated facts and visual traits and, when requested, create photorealistic fictional memory images. The images are not generated from a real photograph and are not intended to identify or reconstruct the person. Cloudflare D1 and R2 store app data and generated images. These providers may process data in other countries under their applicable terms and privacy policies."],
  ["6. Mutual permission and limits", "By using exchange, you permit exchanged users to record and process the profile information you share and private memory notes about you only within Hello Again’s intended memory-support features. This does not authorize sensitive information, secrets, unlawful surveillance, publication, rights infringement, identification, or decisions that affect a person."],
  ["7. AI does not judge people", "AI is used only to organize explicit notes and create user-requested fictional images. It does not classify whether a person is dangerous, trustworthy, desirable, or a “caution person.” The private caution flag is set and removed only by the user."],
  ["8. Retention and deletion", "Location snapshots cease to be used for matching after one hour. Other prototype data may remain until the account is deleted, the service is cleaned up, or the service ends. From Settings > Privacy and data, you can permanently delete your profile, exchanges, private notes, and saved images. Limited records may be retained where required by law or necessary to prevent abuse."],
  ["9. Security and limitations", "We use reasonable safeguards, but no experimental internet service can guarantee absolute security, availability, or recovery. Do not store information you cannot afford to lose or disclose."],
  ["10. Your choices and inquiries", "You may decline location access, decline AI image generation by not accepting the initial consent (in which case the service cannot be used), sign out, or delete your account and data. Privacy inquiries and deletion problems can be reported through the project’s GitHub Issues page. We may need information to verify the request."],
  ["11. Changes", "We may update this policy as the prototype changes. Material updates will use a new policy version and may require renewed consent."],
] as const;

const japaneseSections = [
  ["1. 運営者・適用範囲", "Hello Againは、個人制作者Fumiyaが運営するハッカソン向け実験プロトタイプです。本ポリシーは、本サービス利用時のデータの取扱いを説明します。"],
  ["2. 取り扱うデータ", "プロフィールの名前・読み方・所属・アイコン、確認済みメール、端末セッショントークン、交換履歴、1回取得する位置情報、交換相手に関する非公開メモ、AIが整理した事実・外見的特徴、保存したAI生成画像を取り扱う場合があります。"],
  ["3. 利用目的", "アカウント復元、プロフィール交換、自ら登録した地点付近の交換済み友達の表示、非公開の記憶メモ整理、架空の記憶画像生成、サービス運営・安全確保・障害調査・法令対応のために利用します。"],
  ["4. 位置情報", "位置情報は、利用者が現在地登録または交換操作を行い、ブラウザで許可した場合に1回だけ取得します。バックグラウンドで連続追跡しません。登録地点は1時間後に近接判定へ使われなくなります。友達には近くにいるという結果だけを示し、座標や正確な場所は表示しません。"],
  ["5. AI・外部委託先", "記載された事実と外見的特徴の整理、および利用者が求めた実写風の架空記憶画像の生成のため、メモをOpenAI APIへ送信する場合があります。画像は実在写真を入力としておらず、本人の特定・再構成を目的としません。アプリデータと生成画像の保存にはCloudflare D1・R2を使います。各事業者の規約・ポリシーに基づき、国外で処理される場合があります。"],
  ["6. 交換相手との相互許可・制限", "利用者は交換機能を使うことにより、交換相手が、Hello Againの記憶支援機能に必要な範囲で、利用者が共有したプロフィール情報及び利用者に関する非公開メモを記録・処理することを許可します。この許可は、要配慮情報、秘密、違法な監視、情報の公開、権利侵害、本人確認又は人物に影響する判断を認めるものではありません。"],
  ["7. AIは人物を評価しません", "AIは、明記されたメモの整理と利用者が依頼した架空画像生成だけに使います。危険性、信用性、好ましさ、注意人物かどうかを分類しません。非公開の注意フラグは利用者自身だけが設定・解除します。"],
  ["8. 保存期間・削除", "位置情報は1時間後に近接判定へ使われなくなります。その他のデータは、アカウント削除、サービス側の整理、またはサービス終了まで残る場合があります。設定の「プライバシーとデータ」から、プロフィール、交換履歴、非公開メモ、保存画像を削除できます。法令遵守や不正防止に必要な最小限の記録を保持する場合があります。"],
  ["9. 安全管理と限界", "合理的な安全対策を行いますが、実験的なインターネットサービスであるため、完全な安全性・可用性・復元性は保証できません。失ったり漏えいしたりして困る情報は保存しないでください。"],
  ["10. 選択・問い合わせ", "位置情報を許可しない、初回同意を行わず利用しない、ログアウトする、アカウントとデータを削除する選択ができます。プライバシーに関する問い合わせや削除不具合は、プロジェクトのGitHub Issuesから連絡してください。本人確認に必要な情報をお願いする場合があります。"],
  ["11. 変更", "プロトタイプの変更に応じて本ポリシーを更新することがあります。重要な変更ではポリシー版を更新し、再同意をお願いする場合があります。"],
] as const;

export default function PrivacyPage() {
  return (
    <main className="terms-page">
      <header className="terms-header">
        <Link className="terms-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hello-again-app-icon.png" alt="" width={44} height={44} /><span>Hello Again</span>
        </Link>
        <Link className="terms-back" href="/">Back / トップへ</Link>
      </header>
      <article className="terms-document">
        <div className="terms-title"><p>PRIVACY POLICY</p><h1>Privacy Policy</h1><span>Effective July 21, 2026 · 制定日 2026年7月21日</span></div>
        <aside className="terms-summary"><strong>Your control / 利用者の選択</strong><p>Location is opt-in and expires for matching after one hour. AI never judges people. You can delete your account and stored data from Settings.</p><p>位置情報は任意で、近接判定は1時間で失効します。AIは人物評価を行いません。設定からアカウントと保存データを削除できます。</p></aside>
        <h2 lang="en">English</h2>
        {englishSections.map(([title, body]) => <section key={title} lang="en"><h2>{title}</h2><p>{body}</p></section>)}
        <section lang="en"><h2>Contact</h2><p><a href="https://github.com/ima-work-git/kao_oboenakute_iiyo/issues" target="_blank" rel="noreferrer">GitHub Issues ↗</a></p></section>
        <h2 lang="ja">日本語</h2>
        {japaneseSections.map(([title, body]) => <section key={title} lang="ja"><h2>{title}</h2><p>{body}</p></section>)}
        <footer className="terms-footer"><p>Hello Again · Individual prototype by Fumiya</p><Link href="/">Open Hello Again</Link></footer>
      </article>
    </main>
  );
}
