import './App.css'

function App() {
  const workflow = [
    'Discord에서 기능 요청',
    'E-VA가 요청 정리 및 이슈화',
    '브랜치 생성 후 구현',
    'PR 생성과 preview 배포',
    'preview 확인 후 승인',
    'main 머지 → production 반영',
  ]

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">chess.jihan.kr</p>
        <h1>Vibe Coding, but actually shippable.</h1>
        <p className="lead">
          Discord에서 요청하고, GitHub에서 추적하고, Mac mini에서 preview와
          production을 직접 굴리는 첫 번째 실험 앱입니다.
        </p>

        <div className="hero-actions">
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub 준비
          </a>
          <a href="https://discord.com" target="_blank" rel="noreferrer">
            Discord 흐름
          </a>
        </div>
      </section>

      <section className="grid two-up">
        <article className="panel">
          <h2>현재 방향</h2>
          <ul>
            <li>도메인: jihan.kr</li>
            <li>앱 이름: chess</li>
            <li>스택: React + Vite</li>
            <li>패키지 매니저: pnpm</li>
            <li>배포 루트: /opt/vibecoding</li>
            <li>프로덕션 URL: chess.jihan.kr</li>
          </ul>
        </article>

        <article className="panel">
          <h2>배포 원칙</h2>
          <ul>
            <li>PR마다 preview 분리</li>
            <li>main만 production 반영</li>
            <li>중요 변경은 승인 후 진행</li>
            <li>self-hosted runner는 Mac mini 사용</li>
            <li>Cloudflare + Caddy 조합 우선</li>
          </ul>
        </article>
      </section>

      <section className="panel workflow-panel">
        <h2>작업 흐름</h2>
        <ol>
          {workflow.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </main>
  )
}

export default App
