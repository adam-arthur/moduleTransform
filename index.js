const fg = require('fast-glob');
const fs = require('fs').promises

function getImportName(filePath) {
    const rawFileName = filePath.split('/').at(-1)
    let importName = rawFileName.split('-').map(v => `${v[0].toUpperCase()}${v.slice(1)}`).join('')
    importName = importName.includes('.') ? importName.split('.')[0] : importName
    return `${rawFileName[0]}${importName.slice(1)}`
}


function lower(v) {
    return `${v[0].toLowerCase()}${v.slice(1)}`
}

function getIndentation(s) {
    return ' '.repeat(s.match(/^\s*/)[0].length)
}

main()



const lineGroupers = [
    function shouldGroup(lineIdx, lines) {
        
        const firstLineMatch = /createInferredNgVueComponent\($/.exec(lines[lineIdx])
        const secondLineMatch = /require\(['"].*['"]/.exec(lines[lineIdx + 1])
        const thirdLineMatch = /\)?.name/.exec(lines[lineIdx + 2])

        const doAllLinesMatch = (
            firstLineMatch && secondLineMatch && thirdLineMatch
        );

        if (!doAllLinesMatch) {
            return null;
        }
        
        return {
            newLine: `${getIndentation(lines[lineIdx])}createInferredNgVueComponent(${secondLineMatch[0]})).name,`,
            newIdx: lineIdx + 2,
        }
    },
    function shouldGroup(lineIdx, lines) {
        
        const firstLineMatch = /createInferredNgVueComponent\((require\(['"].*['"]\))\)/.exec(lines[lineIdx])
        const secondLineMatch = /\.name/.exec(lines[lineIdx + 1])

        const doAllLinesMatch = (
            firstLineMatch && secondLineMatch
        );

        if (!doAllLinesMatch) {
            return null;
        }
        return {
            newLine: `${getIndentation(lines[lineIdx])}createInferredNgVueComponent(${firstLineMatch[1]}).name,`,
            newIdx: lineIdx + 1,
        }
    }
]
const transforms = [
    {
        // require('./something').default.name
        match: /createInferredNgVueComponent\(require\(['"](.*)['"]\)\).name/,
        getReplacements(filePath) {
            const importName = getImportName(filePath)
            return {
                top: `import ${importName} from '${filePath}';`,
                inline: `createNgVueComponent(${importName}, '${lower(importName)}')`
            }
        }
    },
    {
        // require('./something').default.name
        match: /require\(['"](.*)['"]\).default.name/,
        getReplacements(filePath) {
            const importName = `${getImportName(filePath)}Module`
            return {
                top: `import ${importName} from '${filePath}';`,
                inline: `${importName}.name`
            }
        }
    },
    {
        // require('./something').default.name
        match: /require\(['"](.*\.html)['"]\)/,
        getReplacements(filePath) {
            const importName = `${getImportName(filePath)}Template`
            return {
                top: `import ${importName} from '${filePath}';`,
                inline: `${importName}`
            }
        }
    }
]

async function main() {
    
    const files = fg.sync([
        `${process.cwd()}/**/*.js`, 
        `${process.cwd()}/**/*.ts`, 
    ])

    let numFilesChanged = 0
    for (const file of files) {
        console.log(file)
        const contents = await fs.readFile(file, 'utf-8')

        const topInjections = []
        let numMatches = 0
        const newLines = []
        const ogLines = contents.split('\n')
        for (let i = 0; i < ogLines.length; i++) {
            let line = ogLines[i]
            
            const grouper = lineGroupers.map(s => s(i, ogLines)).find(v => v)
            if (grouper) {
                i = grouper.newIdx
                line = grouper.newLine
            }
            
            const transform = transforms.find(t => t.match.test(line))

            if (!transform) {
                newLines.push(line)
                continue;
            }
                
            numMatches++
            const [matchedValue, capture] = transform.match.exec(line)


            const { top, inline } = transform.getReplacements(capture)
            topInjections.push(top)
            
            newLines.push(
                line.replace(matchedValue, inline)
            )       
        }

        if (numMatches) {
            numFilesChanged++
            
            const newFileContent = [...topInjections, '', ...newLines].join('\n')
            await fs.writeFile(file, newFileContent)
            console.log('Updated...')
        }
        else {
            console.log('Skipped...')
        }
    }

    console.log('Files Changed: ', numFilesChanged)
}

