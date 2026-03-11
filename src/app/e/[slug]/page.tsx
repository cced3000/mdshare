import { ManageShareClient } from "@/components/editor/manage-share-client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function ManageSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ManageShareClient slug={slug} />;
}
