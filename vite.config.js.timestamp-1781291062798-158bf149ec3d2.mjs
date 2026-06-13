// vite.config.js
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///Users/ataberkol/Documents/MonsterBattler/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///Users/ataberkol/Documents/MonsterBattler/vite.config.js";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var VIEWER = "/tools/sprite-viewer/";
var REDIRECTS = /* @__PURE__ */ new Map([
  ["/sprite-viewer", VIEWER],
  ["/sprite-viewer/", VIEWER],
  ["/tools/sprite-viewer", VIEWER]
]);
function spriteViewerRedirects() {
  const handler = (req, res, next) => {
    const url = req.url ?? "";
    const pathname = url.split("?")[0];
    const qs = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    const target = REDIRECTS.get(pathname);
    if (target) {
      res.writeHead(301, { Location: target + qs });
      res.end();
      return;
    }
    next();
  };
  return {
    name: "sprite-viewer-redirects",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}
var vite_config_default = defineConfig({
  appType: "mpa",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  plugins: [spriteViewerRedirects()],
  // Honor a PORT env var (e.g. from preview tooling); falls back to Vite's default.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : void 0,
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        spriteViewer: "tools/sprite-viewer/index.html",
        spriteViewerRedirect: "sprite-viewer.html",
        spriteViewerAlias: "sprite-viewer/index.html"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXRhYmVya29sL0RvY3VtZW50cy9Nb25zdGVyQmF0dGxlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2F0YWJlcmtvbC9Eb2N1bWVudHMvTW9uc3RlckJhdHRsZXIvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2F0YWJlcmtvbC9Eb2N1bWVudHMvTW9uc3RlckJhdHRsZXIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5cbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuY29uc3QgVklFV0VSID0gJy90b29scy9zcHJpdGUtdmlld2VyLyc7XG5cbi8qKiBQYXRocyB0aGF0IHNob3VsZCAzMDEgdG8gdGhlIGNhbm9uaWNhbCBzcHJpdGUgdmlld2VyIFVSTC4gKi9cbmNvbnN0IFJFRElSRUNUUyA9IG5ldyBNYXAoW1xuICBbJy9zcHJpdGUtdmlld2VyJywgVklFV0VSXSxcbiAgWycvc3ByaXRlLXZpZXdlci8nLCBWSUVXRVJdLFxuICBbJy90b29scy9zcHJpdGUtdmlld2VyJywgVklFV0VSXSxcbl0pO1xuXG5mdW5jdGlvbiBzcHJpdGVWaWV3ZXJSZWRpcmVjdHMoKSB7XG4gIGNvbnN0IGhhbmRsZXIgPSAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb25zdCB1cmwgPSByZXEudXJsID8/ICcnO1xuICAgIGNvbnN0IHBhdGhuYW1lID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgY29uc3QgcXMgPSB1cmwuaW5jbHVkZXMoJz8nKSA/IHVybC5zbGljZSh1cmwuaW5kZXhPZignPycpKSA6ICcnO1xuICAgIGNvbnN0IHRhcmdldCA9IFJFRElSRUNUUy5nZXQocGF0aG5hbWUpO1xuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIHJlcy53cml0ZUhlYWQoMzAxLCB7IExvY2F0aW9uOiB0YXJnZXQgKyBxcyB9KTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbmV4dCgpO1xuICB9O1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdzcHJpdGUtdmlld2VyLXJlZGlyZWN0cycsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShoYW5kbGVyKTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyZVByZXZpZXdTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGhhbmRsZXIpO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGFwcFR5cGU6ICdtcGEnLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtzcHJpdGVWaWV3ZXJSZWRpcmVjdHMoKV0sXG4gIC8vIEhvbm9yIGEgUE9SVCBlbnYgdmFyIChlLmcuIGZyb20gcHJldmlldyB0b29saW5nKTsgZmFsbHMgYmFjayB0byBWaXRlJ3MgZGVmYXVsdC5cbiAgc2VydmVyOiBwcm9jZXNzLmVudi5QT1JUID8geyBwb3J0OiBOdW1iZXIocHJvY2Vzcy5lbnYuUE9SVCksIHN0cmljdFBvcnQ6IHRydWUgfSA6IHVuZGVmaW5lZCxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICBtYWluOiAnaW5kZXguaHRtbCcsXG4gICAgICAgIHNwcml0ZVZpZXdlcjogJ3Rvb2xzL3Nwcml0ZS12aWV3ZXIvaW5kZXguaHRtbCcsXG4gICAgICAgIHNwcml0ZVZpZXdlclJlZGlyZWN0OiAnc3ByaXRlLXZpZXdlci5odG1sJyxcbiAgICAgICAgc3ByaXRlVmlld2VyQWxpYXM6ICdzcHJpdGUtdmlld2VyL2luZGV4Lmh0bWwnLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZTLE9BQU8sVUFBVTtBQUM5VCxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLG9CQUFvQjtBQUY2SixJQUFNLDJDQUEyQztBQUkzTyxJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUM3RCxJQUFNLFNBQVM7QUFHZixJQUFNLFlBQVksb0JBQUksSUFBSTtBQUFBLEVBQ3hCLENBQUMsa0JBQWtCLE1BQU07QUFBQSxFQUN6QixDQUFDLG1CQUFtQixNQUFNO0FBQUEsRUFDMUIsQ0FBQyx3QkFBd0IsTUFBTTtBQUNqQyxDQUFDO0FBRUQsU0FBUyx3QkFBd0I7QUFDL0IsUUFBTSxVQUFVLENBQUMsS0FBSyxLQUFLLFNBQVM7QUFDbEMsVUFBTSxNQUFNLElBQUksT0FBTztBQUN2QixVQUFNLFdBQVcsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2pDLFVBQU0sS0FBSyxJQUFJLFNBQVMsR0FBRyxJQUFJLElBQUksTUFBTSxJQUFJLFFBQVEsR0FBRyxDQUFDLElBQUk7QUFDN0QsVUFBTSxTQUFTLFVBQVUsSUFBSSxRQUFRO0FBQ3JDLFFBQUksUUFBUTtBQUNWLFVBQUksVUFBVSxLQUFLLEVBQUUsVUFBVSxTQUFTLEdBQUcsQ0FBQztBQUM1QyxVQUFJLElBQUk7QUFDUjtBQUFBLElBQ0Y7QUFDQSxTQUFLO0FBQUEsRUFDUDtBQUNBLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGFBQU8sWUFBWSxJQUFJLE9BQU87QUFBQSxJQUNoQztBQUFBLElBQ0EsdUJBQXVCLFFBQVE7QUFDN0IsYUFBTyxZQUFZLElBQUksT0FBTztBQUFBLElBQ2hDO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLEVBQ1QsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxLQUFLO0FBQUEsSUFDcEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTLENBQUMsc0JBQXNCLENBQUM7QUFBQTtBQUFBLEVBRWpDLFFBQVEsUUFBUSxJQUFJLE9BQU8sRUFBRSxNQUFNLE9BQU8sUUFBUSxJQUFJLElBQUksR0FBRyxZQUFZLEtBQUssSUFBSTtBQUFBLEVBQ2xGLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGNBQWM7QUFBQSxRQUNkLHNCQUFzQjtBQUFBLFFBQ3RCLG1CQUFtQjtBQUFBLE1BQ3JCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
