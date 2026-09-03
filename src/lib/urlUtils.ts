export const shortenUrlJSONP = async (url: string): Promise<string> => {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (response.ok) {
      const text = await response.text();
      return text.trim() || url;
    }
  } catch (err) {
    console.error('Failed to shorten url:', err);
  }
  return url;
};
