export async function getGrowThePie() {
  const response = await fetch(
    "https://api.growthepie.xyz/v1/export/txcount.json",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();
  return data;
}
