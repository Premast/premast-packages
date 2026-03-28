"use client";

import { Component } from "react";
import { Button, Result } from "antd";

export class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[premast] Admin error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48 }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle={this.state.error?.message || "An unexpected error occurred."}
            extra={
              <Button
                type="primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Reload page
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
