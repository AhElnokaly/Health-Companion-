const fs = require('fs');
const filePath = 'src/pages/Diet.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = "activeDateTab === '⚖️ الوزن والجسم' ? () : activeDateTab === '⚖️ الوزن والجسم' ? (";
if (content.includes(targetStr)) {
    content = content.replace(targetStr, "");
    // Wait, let's look at the outer container:
    // "          ) : activeDateTab === '⚖️ الوزن والجسم' ? () : activeDateTab === '⚖️ الوزن والجسم' ? ("
    // becomes "          ) : ("
    // Let's replace the whole line:
    content = content.replace("          ) : activeDateTab === '⚖️ الوزن والجسم' ? () : activeDateTab === '⚖️ الوزن والجسم' ? (", "          ) : (");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("SUCCESS");
} else {
    // If exact spacing was slightly different, let's find the substring
    const pos = content.indexOf("⚖️ الوزن والجسم' ? () : activeDateTab");
    if (pos !== -1) {
        console.log("FOUND AT POS", pos);
        // Let's do a more generic regex or index-based replace
        const startLineIndex = content.lastIndexOf('\n', pos);
        const endLineIndex = content.indexOf('\n', pos);
        const lineText = content.substring(startLineIndex, endLineIndex);
        console.log("LINE TEXT IS:", JSON.stringify(lineText));
        const newLineText = "\n          ) : (";
        content = content.substring(0, startLineIndex) + newLineText + content.substring(endLineIndex);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("GENERIC SUCCESS");
    } else {
        console.error("FAILED TO FIND SUBSTRING");
    }
}
