import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
          <p className="text-slate-800 text-lg font-medium mb-2">
            予期しないエラーが発生しました。ページを再読み込みしてください。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
