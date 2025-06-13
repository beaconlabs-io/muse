import fs from "fs";
import path from "path";
import { compileMDX } from "next-mdx-remote/rsc";
import { Evidence } from "@/types";

export function formatDate(timestamp: string) {
  const date = new Date(timestamp);

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function shortAddr(address: string, num: number) {
  return address.slice(0, num) + "..." + address.slice(-num);
}

const blogsContentDirectory = path.join(
  process.cwd(),
  "app",
  "contents",
  "evidence"
);

export const getEvidenceBySlug = async (
  slug: string
): Promise<{ meta: Evidence; content: React.ReactElement } | undefined> => {
  const realSlug = slug.replace(/\.mdx$/, "");
  const filePath = path.join(blogsContentDirectory, `${realSlug}`, "page.mdx");
  let fileContent;

  try {
    console.log(filePath);
    fileContent = fs.readFileSync(filePath, { encoding: "utf8" });
  } catch (error) {
    console.log(error);
    return undefined;
  }

  const { frontmatter, content } = await compileMDX({
    source: fileContent,
    options: {
      parseFrontmatter: true,
    },
  });

  return {
    meta: { evidence_id: realSlug, ...frontmatter } as Evidence,
    content: content,
  };
};

export const getAllEvidenceMeta = async () => {
  const files = fs.readdirSync(blogsContentDirectory);

  const posts: Evidence[] = [];

  for (const file of files) {
    const data = await getEvidenceBySlug(file);
    posts.push(data?.meta as Evidence);
  }

  posts.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return posts;
};
