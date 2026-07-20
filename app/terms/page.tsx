import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Hello Again",
  description: "Terms of Use for the Hello Again experimental prototype.",
};

const englishSections = [
  { title: "1. Scope and explicit consent", paragraphs: ["These Terms govern use of Hello Again, an experimental hackathon prototype operated by its individual creator. Before using the service, you must actively confirm the Terms, Privacy Policy, and AI image consent. If you do not agree, do not use the service."] },
  { title: "2. Experimental service", paragraphs: ["The service may change, be restricted, lose data, or end at any time. It is not for emergency contact, identity verification, medical, employment, credit, safety, or other high-impact decisions."] },
  { title: "3. Accounts and submitted information", paragraphs: ["You must provide lawful, accurate information and protect your device, email, session, and exchange code. You are responsible for information submitted through your account."] },
  { title: "4. Mutual permission between exchanged users", paragraphs: ["By exchanging with another user, you permit that exchanged user to record and process the profile information you share and private notes about you only as needed for Hello Again’s memory-support features. This permission does not authorize publication, surveillance, harassment, discrimination, sensitive or unlawfully obtained information, rights infringement, or use outside the service’s intended features."] },
  { title: "5. Location", paragraphs: ["Location is collected only when you invoke a relevant action and allow browser access. It is a one-time snapshot, not continuous tracking. Nearby results can be inaccurate or delayed, and must not be treated as a safety or identity signal."] },
  { title: "6. AI-generated output", paragraphs: ["OpenAI models may structure explicit notes and generate photorealistic fictional memory images from written descriptions. No real photograph is used as the generation input. Output may be inaccurate, biased, inappropriate, or resemble someone by coincidence; it does not identify or reconstruct the person.", "AI does not classify whether a person is dangerous, trustworthy, desirable, or a caution person. Any private caution flag is solely the user’s manual choice. Never use output for identification, publication, surveillance, harassment, discrimination, or decisions that affect a person."] },
  { title: "7. User content license", paragraphs: ["You retain rights you lawfully hold. You grant the operator a non-exclusive, royalty-free license to store, display, transform, transmit to disclosed processors, troubleshoot, and otherwise use content only as needed to provide and secure the service."] },
  { title: "8. Prohibited conduct", paragraphs: ["No unlawful acts, impersonation, stalking, harassment, surveillance, discrimination, threats, non-consensual personal-data collection or publication, rights infringement, unauthorized access, security abuse, excessive load, resale, or interference with the service."] },
  { title: "9. User interactions", paragraphs: ["Exchanges, reunions, conversations, notes, and location sharing are between users at their own judgment and risk. The operator does not verify identity, intent, trustworthiness, safety, current location, or submitted information, and is not a mediator between users."] },
  { title: "10. Changes, suspension, and termination", paragraphs: ["The operator may modify, restrict, suspend, or end all or part of the service for maintenance, security, third-party outages, legal compliance, technical limits, or operational reasons. Data may become unavailable or be deleted; keep your own copies of anything important."] },
  { title: "11. Deletion and enforcement", paragraphs: ["You may delete your account and data from Settings. The operator may restrict use or delete content for violations, security, protection of others, or other reasonable causes. Data is not guaranteed to be retained, restored, or exported."] },
  { title: "12. Disclaimer", paragraphs: ["The service is provided “as is” and “as available,” without warranties of accuracy, completeness, usefulness, legality, safety, availability, continuity, fitness, compatibility, security, data preservation, nearby results, or AI output."] },
  { title: "13. Limitation of liability", paragraphs: ["To the extent permitted by law, the operator is not liable for indirect, special, incidental, consequential, lost-profit, or data-loss damages. For ordinary negligence, aggregate liability is capped at the greater of JPY 10,000 or fees paid by that user during the preceding 12 months. These limits do not apply where prohibited by law or to intentional misconduct or gross negligence."] },
  { title: "14. Changes to these Terms", paragraphs: ["Reasonable changes may be announced in the service. Material updates may require renewed explicit consent before further use."] },
  { title: "15. Governing law and venue", paragraphs: ["Japanese law governs. Tokyo District Court or Tokyo Summary Court has exclusive agreed jurisdiction in the first instance."] },
] as const;

const sections = [
  {
    title: "第1条（適用・同意）",
    paragraphs: [
      "本利用規約（以下「本規約」）は、Hello Again（以下「本サービス」）の利用条件を定めるものです。利用者は、利用開始前に利用規約、プライバシーポリシーおよびAI画像生成について画面上で明示的に同意する必要があります。",
      "本規約に同意できない場合は、本サービスを利用しないでください。",
    ],
  },
  {
    title: "第2条（実験的サービス）",
    paragraphs: [
      "本サービスは、ハッカソンで開発された実験的なプロトタイプです。運営者は、本サービスが将来にわたり提供されること、特定の機能、品質、保存期間又は互換性が維持されることを保証しません。",
      "利用者は、本サービスを重要な連絡、安全確認、本人確認、医療、雇用、与信その他の重要な判断に用いてはなりません。",
    ],
  },
  {
    title: "第3条（アカウント及び登録情報）",
    paragraphs: [
      "利用者は、真実かつ第三者の権利を侵害しない情報を登録し、必要に応じて最新の状態に保つものとします。端末、メールアドレス、セッション及び交換コードの管理は利用者の責任とします。",
      "運営者は、登録情報の誤り、端末の紛失、認証情報の漏えい又は第三者による利用により生じた損害について、運営者の責めに帰すべき事由がある場合を除き責任を負いません。",
    ],
  },
  {
    title: "第4条（プロフィール・位置情報等）",
    paragraphs: [
      "本サービスは、プロフィール、アイコン、名前の読み方、所属、交換履歴、メモ、位置情報その他の情報を、機能提供に必要な範囲で取り扱います。利用者は、登録する情報の内容及び共有のタイミングを自ら判断するものとします。",
      "位置情報は、利用者が該当する操作を行い、端末で許可した場合にのみ取得されます。位置情報、距離及び近接判定には、端末、通信、建物その他の事情による誤差や遅延が生じることがあります。",
      "利用者は、他の利用者と交換することにより、交換相手が、本サービスの記憶支援機能に必要な範囲で、当該利用者が共有したプロフィール情報及び当該利用者に関する非公開メモを記録・処理することを許可します。",
      "この許可は、情報の公開、監視、嫌がらせ、差別、要配慮情報又は違法に取得した情報の登録、権利侵害、本サービスの本来の機能を超える利用を認めるものではありません。",
    ],
  },
  {
    title: "第5条（利用者コンテンツ）",
    paragraphs: [
      "利用者が登録した文章、画像、メモその他のコンテンツに関する権利は、利用者又は正当な権利者に留保されます。利用者は、運営者に対し、本サービスの提供、保存、表示、変換、障害対応及び改善に必要な範囲で、当該コンテンツを無償かつ非独占的に利用する権利を許諾します。",
      "利用者は、自ら登録するコンテンツにより、第三者の肖像権、プライバシー、著作権、商標権その他の権利を侵害しないものとします。",
    ],
  },
  {
    title: "第6条（AI生成機能）",
    paragraphs: [
      "AIが整理又は生成する文章、特徴、実写風画像その他の出力は、推測を含み、不正確、不適切又は期待と異なる場合があります。生成画像は文章メモから作る架空の記憶画像であり、実在写真を生成入力に使わず、本人を再現・特定するものではありません。偶然似る可能性はあります。",
      "AIは危険性、信用性、好ましさ、注意人物かどうかを分類しません。注意フラグは利用者が自ら設定する非公開情報です。AI出力を本人確認、人物評価、差別的判断、公開、転載その他の第三者に影響する用途に使用してはなりません。",
    ],
  },
  {
    title: "第7条（禁止事項）",
    paragraphs: [
      "利用者は、法令又は公序良俗に違反する行為、なりすまし、ストーキング、嫌がらせ、監視、差別、脅迫、第三者の位置又は個人情報の不当な収集・公開、権利侵害、不正アクセス、過度な負荷、脆弱性の悪用、リバースエンジニアリング、サービスの転売、運営妨害その他運営者が不適切と合理的に判断する行為をしてはなりません。",
    ],
  },
  {
    title: "第8条（利用者間の関係・トラブル）",
    paragraphs: [
      "交換、再会、会話、メモ、位置情報の共有その他の利用者間の行為は、利用者自身の判断と責任で行うものとします。運営者は、利用者の本人性、登録内容、現在地、意図、信用性又は安全性を確認又は保証しません。",
      "利用者間又は利用者と第三者との間で紛争、事故、損害、権利侵害その他のトラブルが生じた場合、当事者間で解決するものとし、運営者は、運営者の責めに帰すべき事由がある場合を除き、仲介、補償その他の責任を負いません。",
    ],
  },
  {
    title: "第9条（停止・変更・終了）",
    paragraphs: [
      "運営者は、保守、障害、セキュリティ上の必要、第三者サービスの停止、法令対応、運営上又は技術上の都合その他の理由により、本サービスの全部又は一部を、いつでも変更、制限、中断又は終了できます。緊急の場合を除き、合理的に可能な範囲で事前に案内します。",
      "本サービスの変更、中断又は終了に伴い、登録情報、メモ、画像その他のデータが利用できなくなり、又は削除されることがあります。必要な情報の控えは利用者自身で保管してください。",
    ],
  },
  {
    title: "第10条（利用制限・データ削除）",
    paragraphs: [
      "運営者は、利用者が本規約に違反した場合、セキュリティ又は他の利用者の保護に必要な場合その他合理的な理由がある場合、事前の通知なく利用停止、登録取消し、コンテンツ又はデータの削除を行うことができます。",
      "運営者は、法令上保存が必要な場合を除き、データを永続的に保存、復元又は引き渡す義務を負いません。",
    ],
  },
  {
    title: "第11条（非保証）",
    paragraphs: [
      "本サービスは現状有姿で提供されます。運営者は、正確性、完全性、有用性、適法性、安全性、可用性、継続性、特定目的への適合性、端末との互換性、エラーや脆弱性がないこと、データが消失しないこと、近接通知又はAI出力が正しいことを保証しません。",
      "通信事業者、クラウド、地図、認証、AIその他の第三者サービスに起因する停止、遅延、仕様変更又は損害について、運営者は、運営者の責めに帰すべき事由がある場合を除き責任を負いません。",
    ],
  },
  {
    title: "第12条（損害賠償責任の制限）",
    paragraphs: [
      "運営者が利用者に対して損害賠償責任を負う場合、その対象は、運営者の行為と相当因果関係のある、現実に発生した直接かつ通常の損害に限り、逸失利益、間接損害、特別損害、結果損害及びデータ消失による損害は含みません。",
      "運営者の重大でない過失により利用者に損害が生じた場合、運営者の賠償責任の総額は、1万円又は当該利用者が損害発生前12か月間に本サービスへ支払った利用料金の合計額のいずれか高い額を上限とします。",
      "前二項の責任制限は、運営者の故意又は重大な過失により生じた損害には適用しません。",
    ],
  },
  {
    title: "第13条（利用者の責任）",
    paragraphs: [
      "利用者が本規約への違反又は利用者の責めに帰すべき行為により運営者又は第三者に損害を与えた場合、利用者は、その行為と相当因果関係のある損害を賠償するものとします。",
    ],
  },
  {
    title: "第14条（本規約の変更）",
    paragraphs: [
      "運営者は、変更が利用者一般の利益に適合する場合、又は本規約の目的に反せず、変更の必要性、変更後の内容の相当性その他の事情に照らして合理的である場合、本規約を変更できます。変更内容と効力発生日は、本サービス上への表示その他適切な方法で案内します。",
      "効力発生日後に本サービスを利用した場合、利用者は変更後の規約に同意したものとみなされます。",
    ],
  },
  {
    title: "第15条（準拠法・合意管轄）",
    paragraphs: [
      "本規約及び本サービスには日本法を適用します。本サービスに関して運営者と利用者との間で生じた紛争については、東京地方裁判所又は東京簡易裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="terms-page">
      <header className="terms-header">
        <Link className="terms-brand" href="/" aria-label="Hello Againのトップページへ戻る">
          {/* The Sites runtime serves this fixed public icon without an image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hello-again-app-icon.png" alt="" width={44} height={44} />
          <span>Hello Again</span>
        </Link>
        <Link className="terms-back" href="/">トップへ戻る</Link>
      </header>

      <article className="terms-document">
        <div className="terms-title">
          <p>TERMS OF USE</p>
          <h1>利用規約</h1>
          <span>Effective July 21, 2026 · 改定日：2026年7月21日</span>
        </div>

        <aside className="terms-summary">
          <strong>Important / 重要事項</strong>
          <p>Hello Again is an experimental prototype. It may change or end and stored data may become unavailable. Keep your own copy of anything important.</p>
          <p>Hello Againは実験的なプロトタイプです。変更・終了し、保存データが利用できなくなる場合があります。重要な情報はご自身でも保管してください。</p>
          <small>English and Japanese are provided together. 日本語と英語を併記しています。</small>
        </aside>

        <h2 lang="en">English</h2>
        {englishSections.map((section) => (
          <section key={section.title} lang="en"><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
        ))}

        <h2 lang="ja">日本語</h2>

        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <footer className="terms-footer">
          <p>Hello Again · Individual prototype by Fumiya</p>
          <Link href="/privacy">Privacy / プライバシー</Link>
          <Link href="/">Hello Againを開く</Link>
        </footer>
      </article>
    </main>
  );
}
