function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  return Response.redirect('https://api.farcaster.xyz/miniapps/hosted-manifest/01985aff-f607-f9c5-362e-140b45a195e9', 308);
}
