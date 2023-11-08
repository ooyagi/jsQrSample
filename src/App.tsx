import { QrReader } from './QrReader';

function App() {
  return (
    <>
      <h1>jsQR読み取りテスト</h1>
      <div className="card">
        <QrReader videoViewWidth={320} videoViewHeight={240} />
      </div>
    </>
  )
}

export default App
