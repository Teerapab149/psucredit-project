const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'seed-data', 'curriculums.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

function removeElectives(categories) {
    if (!categories) return categories;
    return categories.filter(c => c.code !== 'FREE_ELEC').map(c => {
        if (c.children) {
            return { ...c, children: removeElectives(c.children) };
        }
        return c;
    });
}

function processNode(node) {
    if (Array.isArray(node)) {
        return node.map(processNode);
    } else if (typeof node === 'object' && node !== null) {
        if (node.categories) {
            node.categories = removeElectives(node.categories);
        }
        for (const [key, value] of Object.entries(node)) {
            node[key] = processNode(value);
        }
    }
    return node;
}

const newData = processNode(data);
fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf8');
console.log('Successfully stripped FREE_ELEC from curriculums.json');
