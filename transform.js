const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'seed-data', 'curriculums.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

function overrideSum(o1, o2) {
    const map = new Map();
    if (o1) {
        o1.forEach(o => map.set(`${o.planType}_${o.trackType}`, o.requiredCredits));
    }
    if (o2) {
        o2.forEach(o => {
            const key = `${o.planType}_${o.trackType}`;
            map.set(key, (map.get(key) || 0) + o.requiredCredits);
        });
    }
    
    if (map.size === 0) return undefined;
    
    return Array.from(map.entries()).map(([k, v]) => {
        const [planType, trackType] = k.split('_');
        return {
            planType,
            trackType: trackType === 'null' ? null : trackType,
            requiredCredits: v
        };
    });
}

function processNode(node) {
    if (node.code === 'PROF' && node.children) {
        const req = node.children.find(c => c.code === 'PROF_REQ');
        const elec = node.children.find(c => c.code === 'PROF_ELEC');
        const minor = node.children.find(c => c.code === 'MINOR');

        if (elec || minor) {
            const elecCredits = elec ? elec.defaultCredits : 0;
            const minorCredits = minor ? minor.defaultCredits : 0;
            const groupCredits = elecCredits + minorCredits;

            const groupOverrides = overrideSum(
                elec ? elec.planOverrides : null,
                minor ? minor.planOverrides : null
            );

            // Reorder children
            if (elec) elec.sortOrder = 1;
            if (minor) minor.sortOrder = 2;

            const newGroup = {
                name: "กลุ่มวิชาชีพเลือกและวิชาโท",
                code: "PROF_ELEC_GROUP",
                sortOrder: 2,
                defaultCredits: groupCredits,
            };

            if (groupOverrides) {
                newGroup.planOverrides = groupOverrides;
            }

            newGroup.children = [];
            if (elec) newGroup.children.push(elec);
            if (minor) newGroup.children.push(minor);

            // Update PROF children
            node.children = [];
            if (req) {
                 req.sortOrder = 1;
                 node.children.push(req);
            }
            node.children.push(newGroup);
        }
    }

    if (node.children) {
        node.children.forEach(processNode);
    }
    
    // Process top-levels if they exist
    if (node.departments) node.departments.forEach(processNode);
    if (node.curriculums) node.curriculums.forEach(processNode);
    if (node.majors && Array.isArray(node.majors)) node.majors.forEach(processNode);
    if (node.categories) node.categories.forEach(processNode);
}

data.forEach(processNode);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Successfully transformed curriculums.json');
