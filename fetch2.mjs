async function fetchCode() {
  const urls = [
    'https://raw.githubusercontent.com/AhElnokaly/Mahfazty-Flow-AI/main/App.tsx',
    'https://raw.githubusercontent.com/AhElnokaly/Mahfazty-Flow-AI/main/screens/Dashboard.tsx',
    'https://raw.githubusercontent.com/AhElnokaly/Mahfazty-Flow-AI/main/screens/AIInsights.tsx'
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`--- ${url} ---\n` + (await res.text()).substring(0, 1500));
      }
    } catch(e) {}
  }
}
fetchCode();
