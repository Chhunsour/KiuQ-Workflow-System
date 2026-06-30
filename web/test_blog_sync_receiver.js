// Native fetch used

const endpoint = 'https://konstructz.com/api/receiver.php';
const secretToken = '469adf52973e9c839ea7529477635466be52c1661f25888b';

const payload = {
  action: 'sync-blogs',
  replace: true,
  posts: [
    {
      id: '67bb1130-1733-4b94-a3f7-3e270bf31d5a',
      slug: 'testiong',
      title: 'testiong',
      excerpt: 'yes',
      content: '<p>yes</p>',
      category: 'Equipment Guides',
      featuredImage: 'https://skidsteers.us/_next/image?url=%2Fuploads%2Fblog%2Fx1300vs509-1782779405801.png&w=1920&q=75',
      publishedAt: '2026-06-30T02:12:28.526Z',
      seoTitle: '',
      seoDescription: '',
      tags: [],
      updatedAt: '2026-06-30T02:15:01.413Z'
    }
  ]
};

async function main() {
  console.log('Sending test sync-blogs request to Konstructz receiver...');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Token': secretToken
    },
    body: JSON.stringify(payload)
  });

  console.log('HTTP Status:', res.status);
  const text = await res.text();
  console.log('Response Body:', text);
}

main().catch(console.error);
