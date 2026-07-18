import { MataneApp } from "./matane-app";
import { getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const account = await getChatGPTUser();
  return <MataneApp account={account ? { email: account.email, displayName: account.displayName } : null} />;
}
