const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'seed-data', 'curriculums.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

function removeGenEd(categories) {
    if (!categories) return categories;
    return categories.filter(c => c.code !== 'GEN_ED').map(c => {
        if (c.children) {
            return { ...c, children: removeGenEd(c.children) };
        }
        return c;
    });
}

function processNode(node) {
    if (Array.isArray(node)) {
        return node.map(processNode);
    } else if (typeof node === 'object' && node !== null) {
        if (node.categories) {
            node.categories = removeGenEd(node.categories);
        }
        for (const [key, value] of Object.entries(node)) {
            node[key] = processNode(value);
        }
    }
    return node;
}

const newData = processNode(data);
fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf8');
console.log('Successfully stripped GEN_ED from curriculums.json');
