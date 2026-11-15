// Compatibility entry point for the expanded flight + original-model UI suite.
process.argv[2] ||= 'http://127.0.0.1:5173/';
process.argv[3] ||= '/tmp/tomcat-experience';
await import('./check_experience.mjs');
