async function fetchCode() {
  const urls = [
    'https://raw.githubusercontent.com/AhElnokaly/Mahfazty-Flow-AI/main/src/types.ts',
    'https://raw.githubusercontent.com/AhElnokaly/Mahfazty-Flow-AI/main/types.ts',
    'https://raw.githubusercontent.com/AhElnokaly/Mahfazty-Flow-AI/main/store.ts',
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`--- ${url} ---\n` + (await res.text()).substring(0, 1000));
      }
    } catch(e) {}
  }
}
fetchCode();
