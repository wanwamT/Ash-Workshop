import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHighlighter } from 'shiki'

const highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['python'] })
const highlighted = highlighter.codeToHtml('def hello(name: str):\n    return name', { lang: 'python', theme: 'github-dark' })
const fallback = '<pre><code>loading code</code></pre>'
const streaming = '<pre class="shiki shiki-streaming-plain"><code><span class="line">def hello():</span></code></pre>'
const variants = [highlighted, fallback, streaming]
const layouts = ['assistant-msg', 'assistant-msg bubble-msg', 'bubble-user-msg bubble-msg']
const panels = layouts.flatMap((layout, l) => variants.map((html, v) => `<div class="msg-block ${layout}"><div class="code-block-container" id="panel-${l}-${v}"><div class="code-block-header">Python</div><div><div class="shiki-code-wrapper ${v ? 'shiki-code-fallback' : ''}">${html}</div></div></div></div>`)).join('')
const base = readFileSync('src/renderer/static/Block.css', 'utf8')
const glass = readFileSync('src/renderer/components/glass-appearance.css', 'utf8')
const directory = mkdtempSync(join(tmpdir(), 'ash-code-glass-'))
const page = `<!doctype html><html><head><style>:root { --chatbox-background-primary:#242424; --chatbox-background-secondary:#303030; --ash-content-color:#123456; --ash-content-opacity:25%; }</style><style>${base}</style><style>${glass}</style></head><body><div data-ash-glass="control" id="actions" style="background:#333;box-shadow:0 0 10px black"><button style="background:#333">重新生成</button><button>复制</button></div><div data-ash-glass="control" data-ash-navigation="true" id="navigation" style="background:#333"><button>跳转到顶部</button><button>定位到上一条消息</button></div><button data-ash-glass="control" id="scroll" style="background:#333;box-shadow:0 0 10px black">向下</button><div data-ash-glass="message" data-ash-role="assistant" id="ai-bubble">AI</div><div data-ash-glass="message" data-ash-role="user" id="user-bubble">User</div><div class="msg-block assistant-msg"><div data-ash-glass="process" id="process"><div class="mantine-Text-root" style="color:gray">工作了 8.2s</div><div><div data-ash-process-detail="true" id="tool-detail" style="background:rgb(48,48,48)"><p>工具详情</p><code class="mantine-Code-root" id="tool-json" style="background:rgb(64,64,64)">JSON result</code></div><p>思考与过程说明</p><span class="mantine-Text-root" style="color:gray">工具调用</span><svg id="status" style="color:rgb(0,128,0)"></svg></div></div><p id="answer" style="color:rgb(9,8,7)">正文</p></div>${panels}<div id="outside" class="shiki-code-wrapper"><pre>Settings code</pre></div><pre id="ash-result">pending</pre><script>
const root = document.documentElement;
const failures = [];
let checks = 0;
function check(ok, label) { checks++; if (!ok) failures.push(label); }
const transparent = 'rgba(0, 0, 0, 0)';
const fixture = document.createElement('div');
fixture.innerHTML = '<div class="App" id="settings-app" style="background:#242424;padding-top:24px"><div class="ash-chat-panel" id="settings-panel" style="background:#242424"><div data-ash-glass="header" id="page-header" style="background:#242424"><span class="mantine-Title-root">Settings</span></div><div data-ash-settings="surface" id="settings-body" style="background:#242424"></div></div></div><div class="ash-settings-modal" id="settings-modal" style="background:#242424"><div data-ash-glass="header" id="modal-header"><span class="mantine-Title-root">Settings modal</span></div><div data-ash-settings="surface" id="modal-body"></div></div><div data-ash-glass="composer" id="composer" style="background:#303030;box-shadow:0 0 10px black"><textarea style="background:#303030">Draft</textarea><button>Send</button></div>';
document.body.append(fixture);

for (const theme of ['light', 'dark']) {
  root.dataset.mantineColorScheme = theme;
  root.dataset.ashEnabled = 'true';
  root.dataset.ashGlass = 'false';
  const tokens = [...document.querySelectorAll('.msg-block .shiki-code-wrapper span[style]')];
  const ink = tokens.map(el => getComputedStyle(el).color);
  root.dataset.ashGlass = 'true';
  root.style.setProperty('--ash-interface-text','#abcdef');
  root.style.setProperty('--ash-blur','20px');
  for (const value of [0,35,100]) {
    for (const kind of ['header','composer']) {
      root.style.setProperty('--ash-' + kind + '-opacity',value+'%');
      root.style.setProperty('--ash-' + kind + '-filter',value===0?'none':'blur('+(20*value/100)+'px) saturate('+(100+15*value/100)+'%)');
      root.style.setProperty('--ash-' + kind + '-edge','color-mix(in srgb,var(--ash-edge) '+value+'%,transparent)');
      root.style.setProperty('--ash-' + kind + '-shadow',value===0?'none':'var(--ash-shadow)');
    }
    for(const id of ['composer','page-header']) {
      const el=document.getElementById(id),style=getComputedStyle(el);
      const probe=document.createElement('div');probe.style.background='color-mix(in srgb,var(--ash-tint) '+value+'%,transparent)';document.body.append(probe);
      check(style.backgroundColor===getComputedStyle(probe).backgroundColor,theme+' '+id+' tint '+value);probe.remove();
      check(style.opacity==='1',theme+' '+id+' keeps content opaque');
      if(value===0) {
        check(style.backdropFilter==='none',theme+' '+id+' clear filter');
        check(style.boxShadow==='none',theme+' '+id+' clear shadow');
        check(style.borderBottomColor.endsWith('/ 0)')||style.borderBottomColor===transparent,theme+' '+id+' clear border');
      } else check(style.backdropFilter.includes('blur('+(20*value/100)+'px)'),theme+' '+id+' scales filter '+value);
    }
    check(getComputedStyle(document.querySelector('#composer textarea')).backgroundColor===transparent,theme+' composer inner field clear');
  }
  root.dataset.ashGlass='false';root.dataset.ashSettingsActive='true';root.dataset.ashSettingsImage='true';
  root.style.setProperty('--ash-settings-image','url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB")');
  for(const id of ['settings-app','settings-modal']) check(getComputedStyle(document.getElementById(id)).backgroundImage.includes('data:image/png'),theme+' wallpaper spans '+id);
  check(getComputedStyle(document.getElementById('settings-app')).paddingTop==='24px',theme+' safe area preserved');
  for(const id of ['settings-panel','settings-body','modal-body']) check(getComputedStyle(document.getElementById(id)).backgroundColor===transparent,theme+' single settings background '+id);
  root.style.setProperty('--ash-header-opacity','0%');root.style.setProperty('--ash-header-filter','none');root.style.setProperty('--ash-header-shadow','none');root.style.setProperty('--ash-header-edge','transparent');
  for(const id of ['page-header','modal-header']) {
    const style=getComputedStyle(document.getElementById(id));
    check(style.backdropFilter==='none',theme+' settings header filter '+id);
    check(style.backgroundColor.endsWith('/ 0)')||style.backgroundColor===transparent,theme+' settings header clear '+id);
    check(getComputedStyle(document.querySelector('#'+id+' .mantine-Title-root')).color==='rgb(171, 205, 239)',theme+' settings title readable '+id);
  }
  root.dataset.ashEnabled='false';
  check(getComputedStyle(document.getElementById('settings-app')).backgroundColor==='rgb(36, 36, 36)',theme+' disabled restores App');
  check(getComputedStyle(document.getElementById('settings-body')).backgroundColor==='rgb(36, 36, 36)',theme+' disabled restores settings body');
  root.dataset.ashEnabled='true';root.dataset.ashSettingsActive='false';root.dataset.ashSettingsImage='false';root.dataset.ashGlass='true';

  root.style.setProperty('--ash-control-color', '#123456');
  root.style.setProperty('--ash-control-text', '#abcdef');
  for (const opacity of [0,45,100]) {
    root.style.setProperty('--ash-control-opacity', opacity + '%');
    root.style.setProperty('--ash-control-filter', opacity === 0 ? 'none' : 'blur(' + (16 * opacity / 100) + 'px) saturate(' + (100 + 15 * opacity / 100) + '%)');
    root.style.setProperty('--ash-control-edge', 'color-mix(in srgb,var(--ash-edge) ' + opacity + '%,transparent)');
    root.style.setProperty('--ash-control-shadow', opacity === 0 ? 'none' : 'var(--ash-shadow)');
    const controlProbe = document.createElement('div');
    controlProbe.style.background = 'color-mix(in srgb,#123456 ' + opacity + '%,transparent)';
    document.body.append(controlProbe);
    for (const control of document.querySelectorAll('[data-ash-glass="control"]')) {
      const style = getComputedStyle(control);
      check(style.backgroundColor === getComputedStyle(controlProbe).backgroundColor, theme + ' control tint ' + opacity + ' ' + control.id);
      if (opacity === 0) {
        check(style.backdropFilter === 'none', theme + ' zero control filter ' + control.id);
        check(style.boxShadow === 'none', theme + ' zero control shadow ' + control.id);
        check(style.borderTopColor.endsWith('/ 0)') || style.borderTopColor === transparent, theme + ' zero control border ' + control.id);
      } else {
        check(style.backdropFilter.includes('blur(' + (16 * opacity / 100) + 'px)'), theme + ' scaled control blur ' + control.id);
      }
      for (const button of control.querySelectorAll('button')) {
        check(getComputedStyle(button).backgroundColor === transparent, theme + ' inner control button transparent ' + control.id);
      }
    }
    controlProbe.remove();
  }
  root.style.setProperty('--ash-process-color', '#abcdef');
  root.style.setProperty('--ash-process-opacity', '60%');
  root.style.setProperty('--ash-process-text', '#345678');
  root.style.setProperty('--ash-blur', '16px');
  root.style.setProperty('--ash-process-blur', '9.6px');
  root.style.setProperty('--ash-radius', '20px');
  root.style.setProperty('--ash-assistant-color', '#123456');
  root.style.setProperty('--ash-user-color', '#123456');
  const aiBubble = document.querySelector('#ai-bubble');
  const userBubble = document.querySelector('#user-bubble');
  const opacityProbe = document.createElement('div');
  document.body.append(opacityProbe);
  for (const [ai, user] of [[0,100], [100,0], [25,75]]) {
    root.style.setProperty('--ash-assistant-opacity', ai + '%');
    root.style.setProperty('--ash-user-opacity', user + '%');
    for (const [el, value] of [[aiBubble,ai], [userBubble,user]]) {
      opacityProbe.style.background = 'color-mix(in srgb, #123456 ' + value + '%, transparent)';
      check(getComputedStyle(el).backgroundColor === getComputedStyle(opacityProbe).backgroundColor, theme + ' independent bubble opacity ' + el.id + ' ' + value);
    }
  }
  opacityProbe.remove();
  const process = document.querySelector('#process');
  const material = document.createElement('div');
  document.body.append(material);
  material.style.background = 'color-mix(in srgb, #abcdef 60%, transparent)';
  check(getComputedStyle(process).backgroundColor === getComputedStyle(material).backgroundColor, theme + ' process material');
  check(getComputedStyle(process).backdropFilter.includes('blur(9.6px)'), theme + ' process blur');
  check(getComputedStyle(process).borderRadius === '20px', theme + ' process radius');
  for (const text of process.querySelectorAll('.mantine-Text-root,p')) {
    check(getComputedStyle(text).color === 'rgb(52, 86, 120)', theme + ' process text override');
  }
  check(getComputedStyle(document.querySelector('#status')).color === 'rgb(0, 128, 0)', theme + ' status icon preserved');
  check(getComputedStyle(document.querySelector('#answer')).color === 'rgb(9, 8, 7)', theme + ' answer independent');
  root.style.setProperty('--ash-process-opacity', '0%');
  root.style.setProperty('--ash-process-blur', '0px');
  check(getComputedStyle(process).backdropFilter.includes('blur(0px)'), theme + ' process zero blur');
  check(getComputedStyle(document.querySelector('#tool-detail')).backgroundColor === transparent, theme + ' expanded details transparent');
  check(getComputedStyle(document.querySelector('#tool-json')).backgroundColor === transparent, theme + ' tool JSON transparent');
  check(['rgba(0, 0, 0, 0)', 'color(srgb 0.671 0.804 0.937 / 0)'].includes(getComputedStyle(process).backgroundColor) || getComputedStyle(process).backgroundColor.endsWith('/ 0)'), theme + ' process fully transparent');
  root.style.setProperty('--ash-process-opacity', '60%');
  material.remove();

  for (const panel of document.querySelectorAll('.code-block-container')) {
    for (const el of panel.querySelectorAll('.code-block-header,.shiki-code-wrapper,pre,code')) {
      check(getComputedStyle(el).backgroundColor === transparent, theme + ' transparent ' + panel.id + ' ' + el.tagName + '.' + el.className);
    }
    const probe = document.createElement('div');
    probe.style.background = 'color-mix(in srgb, #123456 25%, transparent)';
    document.body.append(probe);
    check(getComputedStyle(panel).backgroundColor === getComputedStyle(probe).backgroundColor, theme + ' configured material ' + panel.id);
    probe.remove();
  }
  tokens.forEach((el, i) => check(getComputedStyle(el).color === ink[i], theme + ' syntax color ' + i));
  check(getComputedStyle(document.querySelector('#outside')).backgroundColor !== transparent, theme + ' outside chat unchanged');
  root.dataset.ashGlass = 'false';
  check(getComputedStyle(document.querySelector('#process')).backgroundColor === transparent, theme + ' process disabled');
  check(getComputedStyle(document.querySelector('#tool-detail')).backgroundColor === 'rgb(48, 48, 48)', theme + ' disabled restores tool details');
  for (const el of document.querySelectorAll('.msg-block .shiki-code-wrapper')) {
    check(getComputedStyle(el).backgroundColor !== transparent, theme + ' disabled glass restores opaque wrapper');
  }
}
document.querySelector('#ash-result').textContent = JSON.stringify({checks, failures});
</script></body></html>`
try {
  const path = join(directory, 'regression.html')
  writeFileSync(path, page)
  const browser = spawnSync(process.env.CHROME_BIN || 'google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--dump-dom', `file://${path}`], { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 })
  if (browser.error || browser.status !== 0) throw new Error(browser.error?.message || browser.stderr.slice(-2000))
  const match = browser.stdout.match(/<pre id="ash-result">([^<]+)<\/pre>/)
  if (!match) throw new Error('Browser regression did not finish')
  const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'))
  console.log(JSON.stringify(result))
  if (result.failures.length) process.exitCode = 1
} finally {
  highlighter.dispose()
  rmSync(directory, { recursive: true, force: true })
}

