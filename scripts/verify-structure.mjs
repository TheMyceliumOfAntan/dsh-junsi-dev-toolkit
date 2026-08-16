// JunSi开发工具包 结构完整性校验
// 用法：node scripts/verify-structure.mjs
// 从仓库根运行；打印每项 PASS/FAIL 便于发布前自检。
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const req = (rel) => existsSync(join(root, rel))
const read1 = (rel) => { try { return readFileSync(join(root, rel), 'utf8') } catch { return '' } }
const sep = '─'.repeat(56)
const results = []
const check = (ok, label) => { results.push([ok, label]) }

// skills
check(req('skills/junsi-dev-toolkit/SKILL.md'), 'skills/junsi-dev-toolkit/SKILL.md')
for (const sub of ['advisor','cluster','code-migrater','computer-use','diagnose-before-fix','memory-skill','project-docs','requirements-driven-dev']) {
  check(req(`skills/junsi-dev-toolkit/${sub}/SKILL.md`), `skills/junsi-dev-toolkit/${sub}/SKILL.md`)
}
check(req('skills/junsi-dev-toolkit/shared/ai-compliance.md'), 'skills/junsi-dev-toolkit/shared/ai-compliance.md')

// plugins
for (const p of ['memory-tools.mjs','tool-search.mjs','routing.mjs','git.mjs']) {
  check(req(`plugins/${p}`), `plugins/${p}`)
}

// MCP
for (const f of ['mcp-server.py','requirements.txt','start-mcp.bat','start-mcp.sh']) {
  check(req(`mcp/project-docs/${f}`), `mcp/project-docs/${f}`)
}

// preset
check(req('preset/agent.cordis.yml'), 'preset/agent.cordis.yml')
check(req('preset/preset.yml'), 'preset/preset.yml')

// preset-junsi-v4pro (full JunSi + anchored bootstrap)
check(req('preset-junsi-v4pro/agent.cordis.yml'), 'preset-junsi-v4pro/agent.cordis.yml')
check(req('preset-junsi-v4pro/preset.yml'), 'preset-junsi-v4pro/preset.yml')
for (const m of ['tool-bootstrap.mjs','compaction-epoch.mjs','custom-bash.mjs','dev-tool-search.mjs','instruction-hint.mjs','skill-search.mjs']) {
  check(req(`preset-junsi-v4pro/${m}`), `preset-junsi-v4pro/${m}`)
}
for (const p of ['plugins/memory-tools.mjs','plugins/tool-search.mjs','plugins/git.mjs']) {
  check(req(`preset-junsi-v4pro/${p}`), `preset-junsi-v4pro/${p}`)
}

// top-level
for (const f of ['README.md','LICENSE','package.json','.gitignore','THIRD_PARTY_NOTICES.md']) check(req(f), f)

// sanity: plugins must NOT reference `harness` (unavailable to preset-local modules)
const mem = read1('plugins/memory-tools.mjs')
const ts = read1('plugins/tool-search.mjs')
check(!/harness\./.test(mem), 'memory-tools.mjs 无 harness 引用')
check(/ctx\.tools\.register/.test(mem), 'memory-tools.mjs 用 ctx.tools.register')
check(/ctx\.tools\.register/.test(ts), 'tool-search.mjs 用 ctx.tools.register')

// sanity: skill shebang is generic (no hardcoded python path)
const py = read1('mcp/project-docs/mcp-server.py')
check(!/C:\\Users\\[^\\]+\\/.test(py.split('\n')[0] || ''), 'mcp-server.py shebang 不硬编码用户路径')

console.log('\n' + sep)
for (const [ok, label] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
console.log(sep)
const fail = results.filter(([ok]) => !ok).length
console.log(`\n${results.length - fail}/${results.length} 通过${fail ? '，存在 ' + fail + ' 项失败' : '，结构完整，可发布'}\n`)
process.exit(fail ? 1 : 0)
