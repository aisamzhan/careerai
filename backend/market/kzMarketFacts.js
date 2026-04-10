const kzMarket = {
  lastUpdated: '2026-03-15',
  source: 'User-provided text ("Kazakhstan Labour Market Knowledge Base (for CareerAI AI System)")',

  industries: [
    {
      id: 'energy_oil_gas',
      name: 'Energy, Oil and Gas',
      overview:
        "One of the most important sectors of Kazakhstan's economy; Kazakhstan is a major producer of oil, gas, uranium, and other natural resources. This sector contributes a large share of GDP and exports.",
      typicalProfessions: [
        'Petroleum Engineer',
        'Drilling Engineer',
        'Mechanical Engineer',
        'Project Manager',
        'Geologist',
        'Safety Engineer',
      ],
      jobRegions: ['Atyrau', 'Aktau', 'Aktobe'],
      notes: [
        'Salaries are typically among the highest in the country.',
        'Employment volume is smaller than service sectors.',
      ],
    },
    {
      id: 'it',
      name: 'Information Technology (IT)',
      overview:
        'Rapidly growing due to digitalization and government support for the technology sector.',
      activities: [
        'Software development',
        'Web development',
        'Mobile application development',
        'Data analysis',
        'Artificial intelligence',
        'Cybersecurity',
        'Cloud computing',
      ],
      jobRegions: ['Almaty', 'Astana'],
      notes: ['Demand for skilled developers continues to grow.'],
    },
    {
      id: 'finance_banking',
      name: 'Finance and Banking',
      overview:
        'Developed financial sector; Almaty is considered the financial center of the country.',
      typicalRoles: [
        'Accountant',
        'Financial Analyst',
        'Auditor',
        'Risk Manager',
        'Investment Analyst',
      ],
      notes: ['Requires strong analytical skills and knowledge of financial systems.'],
      jobRegions: ['Almaty'],
    },
    {
      id: 'trade_retail',
      name: 'Trade and Retail',
      overview: 'Employs a very large portion of the workforce.',
      typicalRoles: [
        'Sales Assistant',
        'Retail Manager',
        'Customer Service Specialist',
        'E-commerce Manager',
      ],
      notes: ['Retail jobs are often entry-level positions for students and young professionals.'],
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      overview: 'Major public sector employer.',
      typicalRoles: [
        'Doctor',
        'Nurse',
        'Pharmacist',
        'Medical Technician',
        'Hospital Administrator',
      ],
      notes: ['Demand for healthcare professionals is constant due to population needs.'],
    },
    {
      id: 'education',
      name: 'Education',
      overview: 'One of the largest sectors in terms of employment.',
      typicalRoles: [
        'School Teacher',
        'University Lecturer',
        'Tutor',
        'Education Administrator',
      ],
      notes: ['Teachers are frequently needed in both urban and rural regions.'],
    },
    {
      id: 'transport_logistics',
      name: 'Transport and Logistics',
      overview:
        'Kazakhstan is a major transit country connecting Europe and Asia, creating demand for logistics and transportation professionals.',
      typicalRoles: [
        'Truck Driver',
        'Logistics Manager',
        'Supply Chain Analyst',
        'Warehouse Manager',
      ],
    },
    {
      id: 'construction_infrastructure',
      name: 'Construction and Infrastructure',
      overview: 'Infrastructure development drives demand for construction professionals.',
      typicalRoles: [
        'Civil Engineer',
        'Construction Manager',
        'Architect',
        'Project Supervisor',
      ],
    },
    {
      id: 'agriculture',
      name: 'Agriculture',
      overview: 'Remains important especially in rural areas.',
      typicalRoles: [
        'Agronomist',
        'Farm Manager',
        'Agricultural Engineer',
        'Livestock Specialist',
      ],
    },
  ],

  professions: [
    {
      id: 'software_developer',
      name: 'Software Developer',
      demandLevel: 'High',
      description: 'Develops software applications, websites, and systems.',
      specializations: [
        'Frontend Developer',
        'Backend Developer',
        'Full Stack Developer',
        'Mobile Developer',
      ],
      requiredSkillGroups: [
        { label: 'JavaScript', anyOf: ['javascript', 'js', 'джаваскрипт'] },
        { label: 'React or Angular', anyOf: ['react', 'angular', 'реакт', 'ангуляр'] },
        { label: 'Node.js', anyOf: ['node', 'nodejs', 'node js'] },
        {
          label: 'Databases (SQL / NoSQL)',
          anyOf: ['sql', 'nosql', 'postgres', 'postgresql', 'mysql', 'mongodb'],
        },
        { label: 'Git', anyOf: ['git', 'github', 'gitlab', 'гит'] },
        { label: 'API development', anyOf: ['api', 'rest', 'rest api', 'graphql'] },
      ],
      salaryRangesKZT: {
        entry: { min: 250_000, max: 450_000, plus: false, text: '250k - 450k KZT' },
        mid: { min: 500_000, max: 900_000, plus: false, text: '500k - 900k KZT' },
        senior: { min: 1_000_000, max: 2_000_000, plus: true, text: '1M - 2M+ KZT' },
      },
      marketNotes: ['Largest IT job markets: Almaty and Astana.'],
    },
    {
      id: 'data_analyst',
      name: 'Data Analyst',
      demandLevel: 'Growing',
      description: 'Analyzes data to help companies make decisions.',
      requiredSkillGroups: [
        { label: 'SQL', anyOf: ['sql', 'postgres', 'postgresql', 'mysql'] },
        { label: 'Python', anyOf: ['python', 'пайтон'] },
        { label: 'Excel', anyOf: ['excel', 'эксель'] },
        {
          label: 'Data visualization tools',
          anyOf: [
            'power bi',
            'tableau',
            'looker',
            'qlik',
            'data studio',
            'matplotlib',
            'seaborn',
          ],
        },
        { label: 'Statistics', anyOf: ['statistics', 'stat', 'probability', 'статистика'] },
        {
          label: 'Business analysis',
          anyOf: ['business analysis', 'requirements', 'stakeholders', 'бизнес анализ'],
        },
      ],
      salaryRangesKZT: {
        entry: { min: 250_000, max: 400_000, plus: false, text: '250k - 400k KZT' },
        mid: { min: 400_000, max: 700_000, plus: false, text: '400k - 700k KZT' },
        senior: { min: 700_000, max: 1_200_000, plus: false, text: '700k - 1.2M KZT' },
      },
    },
    {
      id: 'accountant',
      name: 'Accountant',
      demandLevel: 'High',
      description: 'Manages financial records and reporting.',
      requiredSkillGroups: [
        {
          label: 'Accounting principles',
          anyOf: ['accounting', 'accounting principles', 'бухгалтерия', 'учет'],
        },
        {
          label: 'Financial reporting',
          anyOf: ['financial reporting', 'reporting', 'отчетность', 'финансовая отчетность'],
        },
        { label: 'Excel', anyOf: ['excel', 'эксель'] },
        { label: 'Accounting software (1C)', anyOf: ['1c', '1с', '1c бухгалтерия', '1с бухгалтерия'] },
      ],
      salaryRangesKZT: {
        entry: { min: 180_000, max: 300_000, plus: false, text: '180k - 300k KZT' },
        mid: { min: 350_000, max: 600_000, plus: false, text: '350k - 600k KZT' },
        senior: { min: 700_000, max: 1_000_000, plus: true, text: '700k - 1M+ KZT' },
      },
      marketNotes: ['Almaty is considered the financial center of the country.'],
    },
    {
      id: 'mechanical_engineer',
      name: 'Mechanical Engineer',
      demandLevel: 'Stable',
      description: 'Designs and maintains industrial equipment.',
      requiredSkillGroups: [
        { label: 'Mechanical design', anyOf: ['mechanical design', 'машиностроение', 'механика'] },
        { label: 'CAD software', anyOf: ['cad', 'autocad', 'solidworks', 'компас'] },
        { label: 'Engineering mathematics', anyOf: ['mathematics', 'math', 'инженерная математика'] },
        {
          label: 'Equipment diagnostics',
          anyOf: ['diagnostics', 'equipment diagnostics', 'диагностика оборудования'],
        },
      ],
      salaryRangesKZT: {
        entry: { min: 250_000, max: 400_000, plus: false, text: '250k - 400k KZT' },
        mid: { min: 450_000, max: 800_000, plus: false, text: '450k - 800k KZT' },
        senior: { min: 900_000, max: 1_500_000, plus: false, text: '900k - 1.5M KZT' },
      },
      marketNotes: ['Energy, Oil and Gas jobs are usually in Atyrau, Aktau, Aktobe.'],
    },
    {
      id: 'teacher',
      name: 'Teacher',
      demandLevel: 'High',
      description: 'Educates students in schools or universities.',
      requiredSkillGroups: [
        { label: 'Subject expertise', anyOf: ['subject', 'expertise', 'знание предмета'] },
        {
          label: 'Teaching methodology',
          anyOf: ['teaching methodology', 'methodology', 'педагогика', 'методика'],
        },
        {
          label: 'Communication skills',
          anyOf: ['communication', 'soft skills', 'коммуникация', 'общение'],
        },
      ],
      salaryRangesKZT: {
        entry: { min: 140_000, max: 200_000, plus: false, text: '140k - 200k KZT' },
        mid: { min: 200_000, max: 350_000, plus: false, text: '200k - 350k KZT' },
        senior: { min: 350_000, max: 500_000, plus: false, text: '350k - 500k KZT' },
      },
      marketNotes: ['Teachers are frequently needed in both urban and rural regions.'],
    },
    {
      id: 'logistics_manager',
      name: 'Logistics Manager',
      demandLevel: 'Growing',
      description: 'Manages supply chains and transportation operations.',
      requiredSkillGroups: [
        {
          label: 'Supply chain management',
          anyOf: ['supply chain', 'supply chain management', 'цепочка поставок', 'логистика'],
        },
        { label: 'Logistics planning', anyOf: ['planning', 'logistics planning', 'планирование'] },
        { label: 'Inventory systems', anyOf: ['inventory', 'warehouse', 'склад', 'учет запасов'] },
        { label: 'Excel and ERP systems', anyOf: ['excel', 'erp', 'sap', '1c', '1с'] },
      ],
      salaryRangesKZT: {
        entry: { min: 200_000, max: 350_000, plus: false, text: '200k - 350k KZT' },
        mid: { min: 350_000, max: 600_000, plus: false, text: '350k - 600k KZT' },
        senior: { min: 700_000, max: 1_200_000, plus: false, text: '700k - 1.2M KZT' },
      },
      marketNotes: ['Kazakhstan is a major transit country connecting Europe and Asia.'],
    },
  ],

  general: {
    citySalaryNote: 'Major cities such as Almaty and Astana generally offer higher salaries.',
    industrySalaryNote: 'Certain industries such as oil and gas may offer higher salaries.',
    salaryLevelsKZT: {
      entry: { min: 150_000, max: 400_000, plus: false, text: '150k - 400k KZT' },
      mid: { min: 400_000, max: 900_000, plus: false, text: '400k - 900k KZT' },
      senior: { min: 900_000, max: 2_000_000, plus: true, text: '900k - 2M+ KZT' },
    },
    digitalTools: [
      'Microsoft Excel',
      'Microsoft PowerPoint',
      'CRM systems',
      'Data analysis tools',
      'Project management tools',
    ],
    softSkills: ['Communication', 'Teamwork', 'Problem Solving', 'Time Management', 'Adaptability'],
    languageNotes: [
      'Kazakh is required in government and public sector jobs.',
      'Russian is widely used in business communication.',
      'English is important for international companies and technology sectors.',
      'English proficiency significantly increases opportunities in IT, finance, and multinational organizations.',
    ],
  },

  careerPaths: {
    softwareDevelopment: [
      'Junior Developer',
      'Middle Developer',
      'Senior Developer',
      'Tech Lead',
      'Engineering Manager',
    ],
    dataAnalysis: [
      'Junior Data Analyst',
      'Data Analyst',
      'Senior Data Analyst',
      'Data Scientist',
      'Head of Data / Chief Data Officer',
    ],
    businessManagement: [
      'Business Assistant',
      'Specialist (HR / Marketing / Finance)',
      'Senior Specialist / Team Lead',
      'Department Manager',
      'Director',
    ],
    engineering: [
      'Junior Engineer',
      'Engineer',
      'Senior Engineer',
      'Project Manager',
      'Engineering Director',
    ],
  },
};

module.exports = { kzMarket };
