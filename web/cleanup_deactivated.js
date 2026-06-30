import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('Fetching deactivated/inactive members...');
  
  const { data: deactivatedMembers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, full_name, status')
    .in('status', ['deactivated', 'inactive']);

  if (fetchError) {
    throw fetchError;
  }

  if (!deactivatedMembers || deactivatedMembers.length === 0) {
    console.log('No deactivated or inactive members found.');
    return;
  }

  console.log(`Found ${deactivatedMembers.length} deactivated/inactive members:`);
  for (const member of deactivatedMembers) {
    console.log(`- ${member.full_name || 'No Name'} (${member.email}) [ID: ${member.id}]`);
  }

  const deactivatedIds = deactivatedMembers.map(m => m.id);

  console.log('\nStarting database cleanup for these users...');

  // 1. Mark websites created by deactivated users as inactive
  const { error: webError } = await supabase
    .from('websites')
    .update({ status: 'inactive' })
    .in('created_by', deactivatedIds);
  if (webError) console.error('Error updating websites status:', webError.message);
  else console.log('✓ Marked websites created by deactivated users as inactive.');

  // 2. Delete prompt assignments
  const { error: promptError } = await supabase
    .from('prompt_assignments')
    .delete()
    .in('assigned_member_id', deactivatedIds);
  if (promptError) console.error('Error deleting prompt assignments:', promptError.message);
  else console.log('✓ Cleaned up prompt assignments.');

  // 3. Delete project members
  const { error: projMemberError } = await supabase
    .from('project_members')
    .delete()
    .in('member_id', deactivatedIds);
  if (projMemberError) console.error('Error deleting project memberships:', projMemberError.message);
  else console.log('✓ Cleaned up project memberships.');

  // 4. Delete section tasks (or unassign)
  const { error: taskError } = await supabase
    .from('section_tasks')
    .delete()
    .in('assigned_member_id', deactivatedIds);
  if (taskError) console.error('Error deleting section tasks:', taskError.message);
  else console.log('✓ Cleaned up section tasks.');

  // 5. Delete quality issues
  const { error: issueError } = await supabase
    .from('quality_issues')
    .delete()
    .in('assigned_to', deactivatedIds);
  if (issueError) console.error('Error deleting quality issues:', issueError.message);
  else console.log('✓ Cleaned up quality issues.');

  // 6. Delete docs assignments
  const { error: docsError } = await supabase
    .from('docs_assignments')
    .delete()
    .in('assigned_to', deactivatedIds);
  if (docsError) console.error('Error deleting docs assignments:', docsError.message);
  else console.log('✓ Cleaned up docs assignments.');

  console.log('\nCleanup process completed successfully!');
}

main().catch(console.error);
