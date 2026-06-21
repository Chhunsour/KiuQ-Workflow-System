/**
 * Team Survey — English / Khmer strings and question definitions.
 *
 * Kept self-contained (the app has no global i18n library). The DB stores
 * language-agnostic option *values* (e.g. 'work_board', 'very_easy'); only the
 * labels shown to the user are translated, so switching language never changes
 * the stored answer.
 *
 * Khmer is intentionally simple/everyday, not formal. Product/page names
 * (Work Board, Quality Check, …) stay in English because that is how the team
 * refers to them in the app.
 */

export type SurveyLang = 'en' | 'kh';

export interface SurveyOption {
  value: string;
  en: string;
  kh: string;
}

export const optLabel = (o: SurveyOption, lang: SurveyLang): string => (lang === 'kh' ? o.kh : o.en);

export const surveyOptions: Record<
  'dashboards' | 'feedbackTypes' | 'ease' | 'speed' | 'usefulness' | 'commonProblems' | 'improvements' | 'workflowFeedback' | 'moods',
  SurveyOption[]
> = {
  dashboards: [
    { value: 'dashboard',        en: 'Dashboard',          kh: 'Dashboard' },
    { value: 'work_board',       en: 'Work Board',         kh: 'Work Board' },
    { value: 'quality_check',    en: 'Quality Check',      kh: 'Quality Check' },
    { value: 'followup',         en: 'Followup Center',    kh: 'Followup Center' },
    { value: 'websites',         en: 'Websites',           kh: 'Websites' },
    { value: 'media_library',    en: 'Team Media Library', kh: 'Team Media Library' },
    { value: 'blog_center',      en: 'Blog Center',        kh: 'Blog Center' },
    { value: 'docs',             en: 'Docs',               kh: 'Docs' },
    { value: 'resources',        en: 'Resources',          kh: 'Resources' },
    { value: 'notifications',    en: 'Notifications',       kh: 'Notifications' },
    { value: 'leaderboard',      en: 'Leaderboard',        kh: 'Leaderboard' },
    { value: 'winner_center',    en: 'Winner Center',      kh: 'Winner Center' },
    { value: 'profile_settings', en: 'Profile / Settings', kh: 'Profile / Settings' },
    { value: 'other',            en: 'Other',              kh: 'ផ្សេងទៀត' }
  ],
  feedbackTypes: [
    { value: 'ui_ux',        en: 'UI/UX problem',     kh: 'បញ្ហា UI/UX' },
    { value: 'workflow',     en: 'Workflow problem',  kh: 'បញ្ហា Workflow' },
    { value: 'bug',          en: 'Bug / Error',       kh: 'Bug / Error' },
    { value: 'slow',         en: 'Too slow',          kh: 'យឺតពេក' },
    { value: 'confusing',    en: 'Hard to understand',kh: 'ពិបាកយល់' },
    { value: 'feature_idea', en: 'New feature idea',  kh: 'ចង់បាន Feature ថ្មី' },
    { value: 'complaint',    en: 'Complaint',         kh: 'ការមិនពេញចិត្ត' },
    { value: 'other',        en: 'Other',             kh: 'ផ្សេងទៀត' }
  ],
  ease: [
    { value: 'very_easy', en: 'Easy',      kh: 'ងាយស្រួល' },
    { value: 'okay',      en: 'Okay',      kh: 'ធម្មតា' },
    { value: 'hard',      en: 'Hard',      kh: 'ពិបាក' },
    { value: 'very_hard', en: 'Very hard', kh: 'ពិបាកណាស់' }
  ],
  speed: [
    { value: 'fast',      en: 'Fast',      kh: 'លឿន' },
    { value: 'okay',      en: 'Okay',      kh: 'ធម្មតា' },
    { value: 'slow',      en: 'Slow',      kh: 'យឺត' },
    { value: 'very_slow', en: 'Very slow', kh: 'យឺតណាស់' }
  ],
  usefulness: [
    { value: 'yes',      en: 'Looks good', kh: 'មើលទៅស្អាត' },
    { value: 'a_little', en: 'Okay',       kh: 'ធម្មតា' },
    { value: 'no',       en: 'Needs work', kh: 'ត្រូវកែលម្អ' },
    { value: 'not_sure', en: 'Not sure',   kh: 'មិនសូវច្បាស់' }
  ],
  commonProblems: [
    { value: 'hard_to_find',          en: 'Hard to find things',          kh: 'ពិបាករកមុខងារប្រើ' },
    { value: 'too_many_clicks',       en: 'Too many clicks',              kh: 'ចុចច្រើនដងពេក' },
    { value: 'slow_load',             en: 'Page loads slowly',            kh: 'ទំព័រ load យឺត' },
    { value: 'confusing_button',      en: 'Button is confusing',          kh: 'ប៊ូតុងពិបាកយល់' },
    { value: 'messy_design',          en: 'Design looks messy',           kh: 'ឌីហ្សាញមើលទៅរញ៉េរញ៉ៃ' },
    { value: 'hard_mobile',           en: 'Mobile is hard to use',        kh: 'ពិបាកប្រើលើទូរស័ព្ទ' },
    { value: 'data_not_updating',     en: 'Data does not update',         kh: 'ទិន្នន័យអត់ Update ភ្លាមៗ' },
    { value: 'need_refresh',          en: 'I need to refresh',            kh: 'ត្រូវតែ Refresh ញឹកញាប់' },
    { value: 'annoying_notification',  en: 'Notification is annoying',     kh: 'Notification រំខានពេក' },
    { value: 'do_not_understand',     en: 'I do not understand this page',kh: 'អត់យល់ពីរបៀបប្រើទំព័រនេះ' },
    { value: 'something_broken',      en: 'Something is broken',          kh: 'មានកន្លែងខ្លះដើរខុសធម្មតា' }
  ],
  improvements: [
    { value: 'faster',             en: 'Make it faster',               kh: 'ធ្វើឱ្យដើរលឿនជាងមុន' },
    { value: 'cleaner',            en: 'Make it cleaner',              kh: 'ធ្វើឱ្យមើលទៅស្អាតជាងមុន' },
    { value: 'better_search',      en: 'Add better search',            kh: 'ចង់ឱ្យ Search ស្រួលជាងមុន' },
    { value: 'better_filter',      en: 'Add better filter',            kh: 'ចង់ឱ្យ Filter ស្រួលជាងមុន' },
    { value: 'bulk_actions',       en: 'Add bulk actions',             kh: 'ចង់ធ្វើការងារម្ដងបានច្រើន (Bulk Actions)' },
    { value: 'shortcut_buttons',   en: 'Add more shortcut buttons',    kh: 'ចង់បានប៊ូតុង Shortcut បន្ថែម' },
    { value: 'better_mobile',      en: 'Add better mobile view',       kh: 'ចង់ឱ្យមើលលើទូរស័ព្ទបានស្អាតជាងមុន' },
    { value: 'better_notification',en: 'Add better notification',      kh: 'ចង់បានការជូនដំណឹង (Notification) ល្អជាងមុន' },
    { value: 'better_report',      en: 'Add better report',            kh: 'ចង់បានរបាយការណ៍ (Report) ល្អជាងមុន' },
    { value: 'autofill_option',    en: 'Add auto-fill option',         kh: 'ចង់បានមុខងារបំពេញស្វ័យប្រវត្ត (Auto-fill)' },
    { value: 'export_option',      en: 'Add export option',            kh: 'ចង់បានប៊ូតុង Export ទិន្នន័យ' },
    { value: 'khmer_lang',         en: 'Add Khmer language',           kh: 'ចង់បានភាសាខ្មែរបន្ថែមទៀត' }
  ],
  workflowFeedback: [
    { value: 'saves_time',         en: 'This saves time',              kh: 'ជួយសន្សំសំចៃពេលវេលា' },
    { value: 'wastes_time',        en: 'This wastes time',             kh: 'ខាតពេលខ្លាំង' },
    { value: 'step_confusing',     en: 'This step is confusing',       kh: 'ជំហាននេះងាយនឹងច្រឡំ' },
    { value: 'fewer_steps',        en: 'I need fewer steps',           kh: 'ចង់ឱ្យកាត់បន្ថយជំហាន' },
    { value: 'clear_instructions', en: 'I need clearer instructions',  kh: 'ចង់បានការណែនាំឱ្យច្បាស់ជាងមុន' },
    { value: 'easier_buttons',     en: 'I want easier buttons',        kh: 'ចង់បានប៊ូតុងងាយស្រួលចុច' },
    { value: 'better_status',      en: 'I want better status tracking',kh: 'ចង់បានការតាមដានស្ថានភាព (Status) ឱ្យល្អជាងមុន' },
    { value: 'better_summary',     en: 'I want better dashboard summary', kh: 'ចង់បានរបាយការណ៍សង្ខេបលើ Dashboard ល្អជាងមុន' }
  ],
  moods: [
    { value: 'good',      en: 'Good',      kh: 'ល្អ' },
    { value: 'okay',      en: 'Okay',      kh: 'ធម្មតា' },
    { value: 'annoying',  en: 'Annoying',  kh: 'រំខាន' },
    { value: 'confusing', en: 'Confusing', kh: 'ពិបាកយល់' },
    { value: 'slow',      en: 'Slow',      kh: 'យឺត' },
    { value: 'broken',    en: 'Broken',    kh: 'គាំង/ខូច' }
  ]
};

export interface SurveyStrings {
  bannerTitle: string;
  bannerText: string;
  startSurvey: string;
  later: string;
  giveFeedback: string;
  modalSubtitle: string;
  languageLabel: string;
  english: string;
  khmer: string;
  sectionBasic: string;
  sectionRating: string;
  sectionWritten: string;
  sectionScreenshot: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
  q9: string;
  q10: string;
  ph6: string;
  ph7: string;
  ph8: string;
  ph9: string;
  optional: string;
  uploadHint: string;
  removeImage: string;
  saveDraft: string;
  submit: string;
  close: string;
  savingDraft: string;
  draftSaved: string;
  thankYouTitle: string;
  thankYouText: string;
  submitError: string;
  required: string;
  testingMode: string;
  submitTest: string;
  testSavedTitle: string;
  testSavedText: string;
  stepWord: string;
  back: string;
  next: string;
  writeHelper: string;
  previewingAs: string;
  step1Title: string;
  step1Help: string;
  step2Title: string;
  step2Help: string;
  step3Title: string;
  step3Help: string;
  step4Title: string;
  step4Help: string;
  step5Title: string;
  step5Help: string;
  // UX improvements & Continue Banner strings
  pickPagesHelp: string;
  whatFeelsWrong: string;
  whatToImprove: string;
  submitReviewHelp: string;
  continueBannerText: string;
  continueButton: string;
  surveyDraftPill: string;
  mobileDraftText: string;
  submitSuccess: string;
  ratingEase: string;
  ratingSpeed: string;
  ratingDesign: string;
  moodLabel: string;
  summaryLabel: string;
  customNoteLabel: string;
  customNotePlaceholder: string;
  edit: string;
  requiredWarning: string;
  problemsHeader: string;
  workflowHeader: string;
}

export const surveyText: Record<SurveyLang, SurveyStrings> = {
  en: {
    bannerTitle: 'Help us improve KiuQ Website Team',
    bannerText: 'Tell us what is hard, what is good, and what you want us to fix.',
    startSurvey: 'Start Survey',
    later: 'Later',
    giveFeedback: 'Give Feedback',
    modalSubtitle: 'Quick feedback — no wrong answers. You can save and finish later.',
    languageLabel: 'Language',
    english: 'English',
    khmer: 'ខ្មែរ',
    sectionBasic: 'Basic',
    sectionRating: 'Rating',
    sectionWritten: 'Your feedback',
    sectionScreenshot: 'Screenshot (optional)',
    q1: 'Which dashboard or page are you talking about?',
    q2: 'What type of feedback is this?',
    q3: 'How easy is this page to use?',
    q4: 'How fast does this page feel?',
    q5: 'Does this page help your work?',
    q6: 'What problem did you see?',
    q7: 'What do you want us to fix?',
    q8: 'What new feature do you want?',
    q9: 'Anything else?',
    q10: 'Add a screenshot',
    ph6: 'Tell us what is wrong or annoying.',
    ph7: 'Tell us what should be changed.',
    ph8: 'Tell us your idea.',
    ph9: 'Write anything you want to say.',
    optional: 'Optional',
    uploadHint: 'Click to upload, or paste an image (Ctrl/Cmd + V).',
    removeImage: 'Remove',
    saveDraft: 'Save Draft',
    submit: 'Submit Survey',
    close: 'Close',
    savingDraft: 'Saving draft…',
    draftSaved: 'Draft saved',
    thankYouTitle: 'Thank you!',
    thankYouText: 'Your feedback was sent. We use it to make KiuQ Website Team better.',
    submitError: 'Could not send. Please try again.',
    required: 'Please pick a page first.',
    testingMode: 'Testing Mode',
    submitTest: 'Submit Test Response',
    testSavedTitle: 'Test response saved.',
    testSavedText: 'This was saved as a test. It does not count as team feedback.',
    stepWord: 'Step',
    back: 'Back',
    next: 'Next',
    writeHelper: 'Write simple words. Short answer is okay.',
    previewingAs: 'Previewing as',
    step1Title: 'Pick pages',
    step1Help: 'Choose one or more pages you want to talk about.',
    step2Title: 'What feels wrong?',
    step2Help: 'Click any issue that matches. Selecting multiple is okay.',
    step3Title: 'How does it feel?',
    step3Help: 'Quick ratings & mood — tap what fits.',
    step4Title: 'What to improve?',
    step4Help: 'Click any improvement you want. Selecting multiple is okay.',
    step5Title: 'Review & Send',
    step5Help: 'Review your generated summary, edit as needed, and submit.',
    // UX extensions
    pickPagesHelp: 'Pick one or more pages.',
    whatFeelsWrong: 'What feels wrong?',
    whatToImprove: 'What should we improve?',
    submitReviewHelp: 'You can submit now or add more details.',
    continueBannerText: 'You still have a survey to finish.',
    continueButton: 'Continue',
    surveyDraftPill: 'Survey draft',
    mobileDraftText: 'Survey not finished',
    submitSuccess: 'Thank you. Your feedback was sent.',
    ratingEase: 'Ease of Use',
    ratingSpeed: 'Speed',
    ratingDesign: 'Design / Visuals',
    moodLabel: 'Your Mood / Feeling',
    summaryLabel: 'Feedback summary',
    customNoteLabel: 'Extra details (optional)',
    customNotePlaceholder: 'Write any custom notes here...',
    edit: 'Edit',
    requiredWarning: 'Please select at least one page, one issue/improvement, and a rating/mood.',
    problemsHeader: 'Common Problems',
    workflowHeader: 'Workflow Feedback'
  },
  kh: {
    bannerTitle: 'ជួយឱ្យ KiuQ Website Team កាន់តែល្អ',
    bannerText: 'ប្រាប់យើងថា មានអ្វីពិបាកប្រើ អ្វីល្អ ហើយចង់ឱ្យកែអ្វីខ្លះ។',
    startSurvey: 'ចាប់ផ្ដើម',
    later: 'ទុកពេលក្រោយ',
    giveFeedback: 'ផ្ដល់ Feedback',
    modalSubtitle: 'បំពេញមតិរហ័ស គ្មានចម្លើយខុសទេ។ អាចរក្សាទុកសិន ហើយបំពេញពេលក្រោយបាន។',
    languageLabel: 'ភាសា',
    english: 'English',
    khmer: 'ខ្មែរ',
    sectionBasic: 'ព័ត៌មានទូទៅ',
    sectionRating: 'ការវាយតម្លៃ',
    sectionWritten: 'មតិយោបល់របស់អ្នក',
    sectionScreenshot: 'រូបភាព Screenshot (មិនបង្ខំ)',
    q1: 'តើអ្នកចង់និយាយអំពី Dashboard ឬទំព័រមួយណា?',
    q2: 'តើ Feedback នេះជាប្រភេទអ្វីដែរ?',
    q3: 'តើទំព័រនេះស្រួលប្រើកម្រិតណា?',
    q4: 'តើទំព័រនេះដើរលឿនកម្រិតណា?',
    q5: 'តើទំព័រនេះជួយដល់ការងាររបស់អ្នកដែរទេ?',
    q6: 'តើអ្នកឃើញមានបញ្ហាអ្វីខ្លះ?',
    q7: 'តើអ្នកចង់ឱ្យយើងកែសម្រួលត្រង់ណាខ្លះ?',
    q8: 'តើអ្នកចង់បាន Feature ថ្មីអ្វីខ្លះ?',
    q9: 'តើមានអ្វីបន្ថែមទៀតទេ?',
    q10: 'ដាក់រូបភាព Screenshot',
    ph6: 'ប្រាប់យើងពីអ្វីដែលខុស ឬរំខានដល់ការប្រើប្រាស់...',
    ph7: 'ប្រាប់យើងពីអ្វីដែលគួរកែសម្រួល ឬផ្លាស់ប្ដូរ...',
    ph8: 'ចែករំលែកគំនិត ឬយោបល់របស់អ្នក...',
    ph9: 'សរសេរអ្វីផ្សេងទៀតដែលអ្នកចង់ប្រាប់យើង...',
    optional: 'មិនបង្ខំ',
    uploadHint: 'ចុចដើម្បី Upload ឬ Paste រូបភាព (Ctrl/Cmd + V)',
    removeImage: 'លុបចេញ',
    saveDraft: 'រក្សាទុកជា Draft',
    submit: 'ផ្ញើមតិយោបល់',
    close: 'បិទ',
    savingDraft: 'កំពុងរក្សាទុក Draft...',
    draftSaved: 'បានរក្សាទុកហើយ',
    thankYouTitle: 'អរគុណច្រើន!',
    thankYouText: 'យើងបានទទួលមតិយោបល់របស់អ្នកហើយ។ យើងនឹងយកវាទៅកែលម្អ KiuQ Website Team ឱ្យកាន់តែល្អជាងមុន។',
    submitError: 'មិនអាចផ្ញើបានទេ។ សូមព្យាយាមម្ដងទៀត។',
    required: 'សូមជ្រើសរើស Dashboard ឬទំព័រជាមុនសិន។',
    testingMode: 'របៀបសាកល្បង (Testing Mode)',
    submitTest: 'ផ្ញើការឆ្លើយតបសាកល្បង',
    testSavedTitle: 'រក្សាទុកការឆ្លើយតបសាកល្បងរួចរាល់។',
    testSavedText: 'ការឆ្លើយតបនេះរក្សាទុកសម្រាប់តែការសាកល្បងប៉ុណ្ណោះ ហើយមិនរាប់បញ្ចូលក្នុងមតិយោបល់របស់ក្រុមការងារទេ។',
    stepWord: 'ជំហាន',
    back: 'ត្រឡប់ក្រោយ',
    next: 'បន្ទាប់',
    writeHelper: 'សរសេរពាក្យងាយៗ និងខ្លីៗក៏បានដែរ។',
    previewingAs: 'កំពុង Preview ជា',
    step1Title: 'ជ្រើសរើសទំព័រ',
    step1Help: 'ជ្រើសរើសទំព័រ ឬ Dashboard មួយ ឬច្រើនដែលអ្នកចង់ផ្ដល់មតិយោបល់។',
    step2Title: 'តើមានបញ្ហាអ្វីខ្លះ?',
    step2Help: 'ចុចជ្រើសរើសចំណុចណាដែលអ្នកជួបប្រទះ (ជ្រើសរើសបានច្រើន)។',
    step3Title: 'តើអ្នកមានអារម្មណ៍យ៉ាងណា?',
    step3Help: 'វាយតម្លៃរហ័ស និងអារម្មណ៍របស់អ្នក — ចុចចំណុចដែលត្រូវ។',
    step4Title: 'តើគួរកែលម្អអ្វីខ្លះ?',
    step4Help: 'ចុចជ្រើសរើសចំណុចដែលអ្នកចង់ឱ្យយើងកែលម្អ (ជ្រើសរើសបានច្រើន)។',
    step5Title: 'ពិនិត្យ និងផ្ញើ',
    step5Help: 'ពិនិត្យមើលសេចក្តីសង្ខេបមតិយោបល់ កែសម្រួលបើចាំបាច់ រួចផ្ញើជូនយើង។',
    // UX extensions
    pickPagesHelp: 'ជ្រើសរើសទំព័រមួយ ឬច្រើន។',
    whatFeelsWrong: 'តើមានអ្វីពិបាកប្រើ?',
    whatToImprove: 'តើចង់ឱ្យកែអ្វីខ្លះ?',
    submitReviewHelp: 'អ្នកអាចបញ្ជូនឥឡូវនេះ ឬសរសេរបន្ថែមក៏បាន។',
    continueBannerText: 'អ្នកនៅមានសំណួរមតិយោបល់មិនទាន់បញ្ចប់។',
    continueButton: 'បន្ត',
    surveyDraftPill: 'មតិយោបល់ព្រាង',
    mobileDraftText: 'មិនទាន់បញ្ចប់',
    submitSuccess: 'អរគុណ។ មតិយោបល់របស់អ្នកត្រូវបានបញ្ជូនហើយ។',
    ratingEase: 'ភាពងាយស្រួលប្រើ',
    ratingSpeed: 'ល្បឿន',
    ratingDesign: 'ឌីហ្សាញ / សម្រស់',
    moodLabel: 'អារម្មណ៍ / ការយល់ឃើញ',
    summaryLabel: 'សេចក្តីសង្ខេបមតិយោបល់',
    customNoteLabel: 'ព័ត៌មានលម្អិតបន្ថែម (មិនបង្ខំ)',
    customNotePlaceholder: 'សរសេរមតិបន្ថែមនៅទីនេះ...',
    edit: 'កែប្រែ',
    requiredWarning: 'សូមជ្រើសរើសទំព័រយ៉ាងហោចណាស់មួយ ប្រភេទបញ្ហា/ការកែលម្អ និងការវាយតម្លៃ/អារម្មណ៍។',
    problemsHeader: 'បញ្ហាជួបប្រទះទូទៅ',
    workflowHeader: 'មតិលើលំហូរការងារ'
  }
};

/** Roles an admin can target. 'team_member' also matches the legacy 'member' role. */
export const audienceRoleOptions: { value: string; label: string }[] = [
  { value: 'team_member',     label: 'Team Member' },
  { value: 'assistant_head',  label: 'Assistant Head' },
  { value: 'quality_checker', label: 'Quality Checker' },
  { value: 'head',            label: 'Head' },
  { value: 'supervisor',      label: 'Supervisor' }
];
