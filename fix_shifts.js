const fs = require('fs');

const content = fs.readFileSync('C:/Users/Administrator/OneDrive/Desktop/SMART X V3/src/main/ipc/shifts.js', 'utf8');

const searchStr = `  })

  createNotification(realm, {`;

const idx = content.indexOf(searchStr);

if (idx === -1) {
  console.log('NOT FOUND');
  process.exit(1);
}

console.log('Found at:', idx);

const newContent = content.slice(0, idx + searchStr.length) + `
  const settings = realm.objectForPrimaryKey('BusinessSettings', 'business')
  if (settings && settings.notificationShifts !== false) {` + content.slice(idx + searchStr.length);

const endSearchStr = `  return {`;
const endIdx = content.indexOf(endSearchStr, idx + searchStr.length);
if (endIdx !== -1) {
  // Find the closing brace of the if block
  const endBlockIdx = endIdx + endSearchStr.length;
  // We need to insert closing brace before return
  const finalContent = newContent.slice(0, endBlockIdx) + `
  }` + newContent.slice(endBlockIdx);
  fs.writeFileSync('C:/Users/Administrator/OneDrive/Desktop/SMART X V3/src/main/ipc/shifts.js', finalContent, 'utf8');
  console.log('Done!');
} else {
  console.log('End not found');
}