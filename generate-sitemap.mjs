import { readdirSync, statSync, writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import { join, relative } from 'path'

const dir = '.'
const host = process.argv[2] || readFileSync('CNAME', 'utf8').trim()
const skip = new Set(['.git', '.github', 'node_modules'])

const walk = d => readdirSync(d).flatMap(f => {
  if (skip.has(f)) return []
  const p = join(d, f)
  return statSync(p).isDirectory() ? walk(p) : [p]
})

const lastmod = f => {
  try {
    const d = execSync(`git log -1 --format=%cs -- "${f}"`).toString().trim()
    if (d) return d
  } catch {}
  return statSync(f).mtime.toISOString().slice(0, 10)
}

const urls = walk(dir)
  .filter(f => f.endsWith('.html') && !f.includes('404'))
  .map(f => {
    let path = '/' + relative(dir, f).replaceAll('\\', '/')
    path = path.replace(/index\.html$/, '').replace(/\.html$/, '')
    return { loc: `https://${host}${path}`, lastmod: lastmod(f) }
  })

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>`

writeFileSync('sitemap.xml', xml)
writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`)
console.log(`${urls.length} URL → ${host}`)
