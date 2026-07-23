const { execSync } = require('child_process');

try {
  console.log('🚀 Executing automatic push to GitHub & Vercel Trigger...');
  execSync('git add .', { stdio: 'inherit' });
  
  const status = execSync('git status --porcelain').toString().trim();
  if (status.length > 0) {
    const timestamp = new Date().toISOString();
    execSync(`git commit -m "auto: updates and fixes [${timestamp}]"`, { stdio: 'inherit' });
  }

  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✅ Push completed successfully. GitHub Actions and Vercel Deployment triggered!');
} catch (error) {
  console.error('❌ Error during auto-push:', error.message);
}
