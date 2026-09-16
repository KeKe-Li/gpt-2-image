import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('应用渲染失败', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert">
          <h1>页面暂时无法显示</h1>
          <p>请刷新页面重试；如果问题持续存在，请稍后再访问。</p>
        </main>
      );
    }

    return this.props.children;
  }
}
