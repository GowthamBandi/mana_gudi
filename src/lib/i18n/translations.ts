/**
 * Mana Gudi — Bilingual Translation Dictionary (English + Telugu).
 *
 * Provides strongly-typed translation keys for all user-facing public UI text.
 */

export type Language = "en" | "te";

export interface Translations {
  // Brand & General
  siteTitle: string;
  villageTrust: string;
  tagline: string;
  taglineSub: string;

  // Navigation
  navHome: string;
  navAbout: string;
  navEvents: string;
  navTransparency: string;
  navVerify: string;
  navGallery: string;
  navVideos: string;
  navDocuments: string;
  navNotices: string;
  navContact: string;
  navVolunteer: string;
  navFeedback: string;
  navAdminLogin: string;

  // Actions & Buttons
  btnSeeFullAccounts: string;
  btnAllEvents: string;
  btnRegister: string;
  btnConfirmRegistration: string;
  btnVerifyReceipt: string;
  btnDownloadPdf: string;
  btnTryAgain: string;
  btnSubmit: string;
  btnCancel: string;

  // Home Page
  homeHeroHeading: string;
  homeHeroSub: string;
  homeAccountsHeading: string;
  homeEventsHeading: string;
  statDonations: string;
  statExpenses: string;
  statBalance: string;
  statRecords: string;
  statReceiptsCount: string;
  statVouchersCount: string;
  statAllFunds: string;
  statNothingHidden: string;

  // Empty States
  emptyEventsTitle: string;
  emptyEventsHint: string;
  emptyDonationsTitle: string;
  emptyDonationsHint: string;
  emptyExpensesTitle: string;
  emptyExpensesHint: string;
  emptyGalleryTitle: string;
  emptyGalleryHint: string;
  emptyVideosTitle: string;
  emptyVideosHint: string;
  emptyDocumentsTitle: string;
  emptyDocumentsHint: string;
  emptyAnnouncementsTitle: string;
  emptyAnnouncementsHint: string;
  emptyAccountsTitle: string;
  emptyAccountsHint: string;

  // Event Details & Registration
  eventWhen: string;
  eventWhere: string;
  eventDeity: string;
  eventContribution: string;
  eventNoCharge: string;
  eventRegistrationRequired: string;
  eventNoRegistrationNeeded: string;
  eventPleaseNote: string;
  eventWhatToBring: string;
  eventRegFullTitle: string;
  eventRegFullHint: string;

  // Form Fields & Labels
  formYourName: string;
  formMobileNumber: string;
  formMobileHint: string;
  formHowManyPeople: string;
  formGotram: string;
  formNakshatram: string;
  formEmailOptional: string;
  formSpecialRequest: string;
  formPrivacyNotice: string;
  formReceiptRefLabel: string;
  formReceiptRefPlaceholder: string;

  // Registration Confirmation
  regSuccessTitle: string;
  regSuccessBody: string;
  regAlreadyRegisteredTitle: string;
  regArrivalNote: string;

  // Footer & Misc
  footerTransparencyDesc: string;
  footerTransparencyHeader: string;
  footerParticipateHeader: string;
  footerTrustRights: string;
  footerAdminLogin: string;
  loadingLabel: string;
  errorTitle: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    siteTitle: "Mana Gudi",
    villageTrust: "Village Temple Trust",
    tagline: "Mana Gudi · Village Trust",
    taglineSub:
      "Daily temple timings, upcoming poojas and festivals, with a fully public record of every donation received and every rupee spent.",

    navHome: "Home",
    navAbout: "About",
    navEvents: "Events & Poojas",
    navTransparency: "Transparency",
    navVerify: "Verify Receipt",
    navGallery: "Gallery",
    navVideos: "Videos",
    navDocuments: "Documents",
    navNotices: "Notices",
    navContact: "Contact",
    navVolunteer: "Volunteer",
    navFeedback: "Feedback",
    navAdminLogin: "Admin Login",

    btnSeeFullAccounts: "See full accounts →",
    btnAllEvents: "All events →",
    btnRegister: "Register →",
    btnConfirmRegistration: "Confirm my registration",
    btnVerifyReceipt: "Verify receipt",
    btnDownloadPdf: "Download PDF",
    btnTryAgain: "Try again",
    btnSubmit: "Submit",
    btnCancel: "Cancel",

    homeHeroHeading: "Every rupee given to this temple is shown to the whole village.",
    homeHeroSub:
      "You do not need an account and you do not need to ask anyone. Donations, expenses and fund balances are published here, and any receipt can be checked by its number.",
    homeAccountsHeading: "Temple accounts at a glance",
    homeEventsHeading: "Upcoming poojas, homams and festivals",
    statDonations: "Donations received",
    statExpenses: "Money spent",
    statBalance: "Balance held",
    statRecords: "Records published",
    statReceiptsCount: "receipts",
    statVouchersCount: "vouchers",
    statAllFunds: "Across all funds",
    statNothingHidden: "Every single rupee",

    emptyEventsTitle: "No events are scheduled at the moment",
    emptyEventsHint: "Festival and pooja dates will appear here as soon as the committee fixes them.",
    emptyDonationsTitle: "No donations published yet",
    emptyDonationsHint: "Published donation receipts will appear here on the public ledger.",
    emptyExpensesTitle: "No expenses published yet",
    emptyExpensesHint: "Verified expense vouchers will appear here on the public transparency record.",
    emptyGalleryTitle: "No gallery photos published yet",
    emptyGalleryHint: "Photographs of festival celebrations and temple sevas will be published here.",
    emptyVideosTitle: "No videos published yet",
    emptyVideosHint: "Video recordings of utsavams and spiritual discourses will appear here.",
    emptyDocumentsTitle: "No public documents published yet",
    emptyDocumentsHint: "Official trust documents and annual audit statements will be published here.",
    emptyAnnouncementsTitle: "No notices published yet",
    emptyAnnouncementsHint: "Important temple announcements will appear here.",
    emptyAccountsTitle: "No published financial records yet",
    emptyAccountsHint: "Once the committee verifies the first records, public totals will appear here.",

    eventWhen: "When",
    eventWhere: "Where",
    eventDeity: "Deity",
    eventContribution: "Contribution",
    eventNoCharge: "No charge",
    eventRegistrationRequired: "Registration required",
    eventNoRegistrationNeeded: "No registration is needed for this event. All devotees are welcome.",
    eventPleaseNote: "Please note",
    eventWhatToBring: "What to bring",
    eventRegFullTitle: "Registration is full",
    eventRegFullHint: "All places have been taken. Contact the temple committee for waiting list information.",

    formYourName: "Your name",
    formMobileNumber: "Mobile number",
    formMobileHint: "10 digits. Used only to contact you regarding this event.",
    formHowManyPeople: "How many people are coming?",
    formGotram: "Gotram",
    formNakshatram: "Nakshatram",
    formEmailOptional: "Email address (Optional)",
    formSpecialRequest: "Anything the temple should know? (Optional)",
    formPrivacyNotice: "Your phone number is visible only to the temple committee. It is never published.",
    formReceiptRefLabel: "Receipt / Reference Number",
    formReceiptRefPlaceholder: "e.g., DON-2026-00001",

    regSuccessTitle: "You are registered",
    regSuccessBody: "Your registration for this event is confirmed.",
    regAlreadyRegisteredTitle: "You are already registered",
    regArrivalNote: "Please arrive a few minutes early and mention your mobile number at the registration desk.",

    footerTransparencyDesc:
      "Every rupee received and every rupee spent is published here for the whole village to see.",
    footerTransparencyHeader: "Transparency",
    footerParticipateHeader: "Take part",
    footerTrustRights: "Mana Gudi Village Temple Trust",
    footerAdminLogin: "Administrator Login",
    loadingLabel: "Loading",
    errorTitle: "Something went wrong",
  },
  te: {
    siteTitle: "మన గుడి",
    villageTrust: "గ్రామ దేవాలయ ట్రస్ట్",
    tagline: "మన గుడి · గ్రామ ట్రస్ట్",
    taglineSub:
      "ఆలయ సమయాలు, పూజలు మరియు ఉత్సవాల వివరాలు, మరియు స్వీకరించిన ప్రతీ విరాళం, చేసిన ప్రతీ ఖర్చు యొక్క పారదర్శక వివరాలు.",

    navHome: "హోమ్",
    navAbout: "గురించి",
    navEvents: "కార్యక్రమాలు & పూజలు",
    navTransparency: "పారదర్శకత",
    navVerify: "విరాళం ధృవీకరణ",
    navGallery: "గ్యాలరీ",
    navVideos: "వీడియోలు",
    navDocuments: "పత్రాలు",
    navNotices: "ప్రకటనలు",
    navContact: "సంప్రదించండి",
    navVolunteer: "సేవకులు",
    navFeedback: "అభిప్రాయాలు",
    navAdminLogin: "నిర్వాహకుల లాగిన్",

    btnSeeFullAccounts: "పూర్తి ఖాతాలు చూడండి →",
    btnAllEvents: "అన్ని కార్యక్రమాలు →",
    btnRegister: "నమోదు చేసుకోండి →",
    btnConfirmRegistration: "నా నమోదును నిర్ధారించండి",
    btnVerifyReceipt: "రసీదును ధృవీకరించండి",
    btnDownloadPdf: "PDF డౌన్‌లోడ్ చేయండి",
    btnTryAgain: "మళ్లీ ప్రయత్నించండి",
    btnSubmit: "సమర్పించండి",
    btnCancel: "రద్దు చేయండి",

    homeHeroHeading: "ఈ ఆలయానికి ఇచ్చిన ప్రతి రూపాయి మొత్తం గ్రామానికి పారదర్శకంగా చూపబడుతుంది.",
    homeHeroSub:
      "ఎటువంటి లాగిన్ లేదా అనుమతి అవసరం లేదు. విరాళాలు, ఖర్చులు మరియు నిధుల వివరాలు ప్రచురించబడతాయి, మరియు ప్రతీ రసీదును ధృవీకరించుకోవచ్చు.",
    homeAccountsHeading: "ఆలయ ఖాతాలు ఒక చూపులో",
    homeEventsHeading: "రాబోయే పూజలు, హోమాలు మరియు ఉత్సవాలు",
    statDonations: "స్వీకరించిన విరాళాలు",
    statExpenses: "చేసిన ఖర్చులు",
    statBalance: "మిగిలిన నిల్వ",
    statRecords: "ప్రచురించిన వివరాలు",
    statReceiptsCount: "రసీదులు",
    statVouchersCount: "వోచర్లు",
    statAllFunds: "అన్ని నిధులలో కలిపి",
    statNothingHidden: "ప్రతీ ఒక్క రూపాయి",

    emptyEventsTitle: "ప్రస్తుతం ఎటువంటి కార్యక్రమాలు లేవు",
    emptyEventsHint: "కమిటీ నిర్ణయించిన వెంటనే ఉత్సవాలు మరియు పూజల వివరాలు ఇక్కడ కనిపిస్తాయి.",
    emptyDonationsTitle: "ఇంకా ఎటువంటి విరాళాల వివరాలు ప్రచురించబడలేదు",
    emptyDonationsHint: "ప్రచురించబడిన విరాళాల రసీదులు ఇక్కడ పబ్లిక్ లెడ్జర్‌లో కనిపిస్తాయి.",
    emptyExpensesTitle: "ఇంకా ఎటువంటి ఖర్చుల వివరాలు ప్రచురించబడలేదు",
    emptyExpensesHint: "ధృవీకరించబడిన ఖర్చుల వివరాలు ఇక్కడ కనిపిస్తాయి.",
    emptyGalleryTitle: "ప్రస్తుతం గ్యాలరీలో చిత్రాలు లేవు",
    emptyGalleryHint: "ఉత్సవాలు మరియు ఆలయ సేవల ఫోటోలు ఇక్కడ ప్రచురించబడతాయి.",
    emptyVideosTitle: "ప్రస్తుతం వీడియోలు అందుబాటులో లేవు",
    emptyVideosHint: "ఉత్సవాలు మరియు ఆధ్యాత్మిక ప్రవచనాల వీడియోలు ఇక్కడ కనిపిస్తాయి.",
    emptyDocumentsTitle: "ప్రస్తుతం ఎటువంటి పత్రాలు లేవు",
    emptyDocumentsHint: "అధికారిక ట్రస్ట్ పత్రాలు మరియు వార్షిక ఆడిట్ నివేదికలు ఇక్కడ ప్రచురించబడతాయి.",
    emptyAnnouncementsTitle: "ప్రస్తుతం ఎటువంటి ప్రకటనలు లేవు",
    emptyAnnouncementsHint: "ముఖ్యమైన ఆలయ ప్రకటనలు ఇక్కడ కనిపిస్తాయి.",
    emptyAccountsTitle: "ఇంకా ఎటువంటి ఆర్థిక వివరాలు ప్రచురించబడలేదు",
    emptyAccountsHint: "కమిటీ మొదటి వివరాలను ప్రచురించిన వెంటనే ఇక్కడ మొత్తం నిధులు కనిపిస్తాయి.",

    eventWhen: "సమయం",
    eventWhere: "స్థలం",
    eventDeity: "దేవత",
    eventContribution: "రుసుము / విరాళం",
    eventNoCharge: "ఉచితం",
    eventRegistrationRequired: "నమోదు తప్పనిసరి",
    eventNoRegistrationNeeded: "ఈ కార్యక్రమానికి నమోదు అవసరం లేదు. భక్తులందరికీ స్వాగతం.",
    eventPleaseNote: "గమనిక",
    eventWhatToBring: "తేవలసిన వస్తువులు",
    eventRegFullTitle: "నమోదు పూర్తయింది",
    eventRegFullHint: "అన్ని స్థానాలు పూర్తయ్యాయి. వివరాల కోసం ఆలయ కమిటీని సంప్రదించండి.",

    formYourName: "మీ పేరు",
    formMobileNumber: "మొబైల్ సంఖ్య",
    formMobileHint: "10 అంకెలు. ఈ కార్యక్రమం సమాచారం కోసం మాత్రమే ఉపయోగిస్తాము.",
    formHowManyPeople: "ఎంతమంది వస్తున్నారు?",
    formGotram: "గోత్రం",
    formNakshatram: "నక్షత్రం",
    formEmailOptional: "ఈమెయిల్ (ఐచ్ఛికం)",
    formSpecialRequest: "ఆలయానికి తెలియజేయవలసిన ఇతర వివరాలు? (ఐచ్ఛికం)",
    formPrivacyNotice: "మీ ఫోన్ నంబర్ ఆలయ కమిటీకి మాత్రమే కనిపిస్తుంది. ఎప్పుడూ బయట ప్రచురించబడదు.",
    formReceiptRefLabel: "రసీదు / రెఫరెన్స్ సంఖ్య",
    formReceiptRefPlaceholder: "ఉదాహరణ: DON-2026-00001",

    regSuccessTitle: "మీ పేరు నమోదయ్యేది",
    regSuccessBody: "ఈ కార్యక్రమానికి మీ నమోదు ధృవీకరించబడింది.",
    regAlreadyRegisteredTitle: "మీరు ఇప్పటికే నమోదు చేసుకున్నారు",
    regArrivalNote: "దయచేసి కొన్ని నిమిషాల ముందుగా వచ్చి నమోదు డెస్క్ వద్ద మీ మొబైల్ సంఖ్యను తెలియజేయండి.",

    footerTransparencyDesc:
      "స్వీకరించిన ప్రతి రూపాయి మరియు చేసిన ప్రతి ఖర్చు గ్రామ ప్రజలందరికీ పారదర్శకంగా ఇక్కడ ప్రచురించబడుతుంది.",
    footerTransparencyHeader: "పారదర్శకత",
    footerParticipateHeader: "పాల్గొనండి",
    footerTrustRights: "మన గుడి గ్రామ దేవాలయ ట్రస్ట్",
    footerAdminLogin: "నిర్వాహకుల లాగిన్",
    loadingLabel: "లోడ్ అవుతోంది",
    errorTitle: "ఏదో పొరపాటు జరిగింది",
  },
};
