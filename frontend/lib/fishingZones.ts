export type SustainabilityCategoryScores = {
  vessel_efficiency: { score: number };
  fishing_method: { score: number };
  environmental_practices: { score: number };
  compliance_and_transparency: { score: number };
  social_responsibility: { score: number };
};

export type FishingZone = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  vessel: {
    name: string;
    imo_number: string;
    model: string;
    flag_state: string;
    year_built: number;
  };
  sustainability_score: {
    total_score: number;
    grade: string;
    categories: SustainabilityCategoryScores;
  };
};

export const fishingZones: FishingZone[] = [
  {
    id: 'fishing-zone-1',
    lat: 20,
    lng: -30,
    name: 'North Atlantic Central',
    vessel: {
      name: 'FV Ocean Star',
      imo_number: '9234567',
      model: 'Purse Seiner 85m',
      flag_state: 'Norway',
      year_built: 2012
    },
    sustainability_score: {
      total_score: 78,
      grade: 'B',
      categories: {
        vessel_efficiency: { score: 70 },
        fishing_method: { score: 65 },
        environmental_practices: { score: 82 },
        compliance_and_transparency: { score: 90 },
        social_responsibility: { score: 75 }
      }
    }
  },
  {
    id: 'fishing-zone-2',
    lat: 47,
    lng: -52,
    name: 'Grand Banks (Canada)',
    vessel: {
      name: 'FV Atlantic Pride',
      imo_number: '9245678',
      model: 'Trawler 72m',
      flag_state: 'Canada',
      year_built: 2015
    },
    sustainability_score: {
      total_score: 85,
      grade: 'A',
      categories: {
        vessel_efficiency: { score: 88 },
        fishing_method: { score: 82 },
        environmental_practices: { score: 90 },
        compliance_and_transparency: { score: 92 },
        social_responsibility: { score: 80 }
      }
    }
  },
  {
    id: 'fishing-zone-3',
    lat: 56,
    lng: 3,
    name: 'North Sea',
    vessel: {
      name: 'FV Nordic Harvest',
      imo_number: '9256789',
      model: 'Factory Trawler 95m',
      flag_state: 'Netherlands',
      year_built: 2018
    },
    sustainability_score: {
      total_score: 82,
      grade: 'A-',
      categories: {
        vessel_efficiency: { score: 85 },
        fishing_method: { score: 78 },
        environmental_practices: { score: 88 },
        compliance_and_transparency: { score: 95 },
        social_responsibility: { score: 78 }
      }
    }
  },
  {
    id: 'fishing-zone-4',
    lat: 57,
    lng: -178,
    name: 'Bering Sea',
    vessel: {
      name: 'FV Alaska Gold',
      imo_number: '9267890',
      model: 'Longliner 68m',
      flag_state: 'USA',
      year_built: 2010
    },
    sustainability_score: {
      total_score: 73,
      grade: 'B-',
      categories: {
        vessel_efficiency: { score: 68 },
        fishing_method: { score: 70 },
        environmental_practices: { score: 75 },
        compliance_and_transparency: { score: 88 },
        social_responsibility: { score: 72 }
      }
    }
  },
  {
    id: 'fishing-zone-5',
    lat: 38,
    lng: 141,
    name: 'Sanriku (Japan)',
    vessel: {
      name: 'FV Pacific Dawn',
      imo_number: '9278901',
      model: 'Purse Seiner 78m',
      flag_state: 'Japan',
      year_built: 2016
    },
    sustainability_score: {
      total_score: 80,
      grade: 'B+',
      categories: {
        vessel_efficiency: { score: 82 },
        fishing_method: { score: 75 },
        environmental_practices: { score: 85 },
        compliance_and_transparency: { score: 90 },
        social_responsibility: { score: 76 }
      }
    }
  },
  {
    id: 'fishing-zone-6',
    lat: -42,
    lng: 148,
    name: 'Tasmania Coast',
    vessel: {
      name: 'FV Southern Cross',
      imo_number: '9289012',
      model: 'Trawler 65m',
      flag_state: 'Australia',
      year_built: 2019
    },
    sustainability_score: {
      total_score: 87,
      grade: 'A',
      categories: {
        vessel_efficiency: { score: 90 },
        fishing_method: { score: 85 },
        environmental_practices: { score: 92 },
        compliance_and_transparency: { score: 93 },
        social_responsibility: { score: 82 }
      }
    }
  },
  {
    id: 'fishing-zone-7',
    lat: -14,
    lng: -77,
    name: 'Peru Current',
    vessel: {
      name: 'FV Humboldt Star',
      imo_number: '9290123',
      model: 'Purse Seiner 82m',
      flag_state: 'Peru',
      year_built: 2014
    },
    sustainability_score: {
      total_score: 68,
      grade: 'C+',
      categories: {
        vessel_efficiency: { score: 65 },
        fishing_method: { score: 62 },
        environmental_practices: { score: 70 },
        compliance_and_transparency: { score: 85 },
        social_responsibility: { score: 68 }
      }
    }
  },
  {
    id: 'fishing-zone-8',
    lat: -33,
    lng: -72,
    name: 'Chile Coast',
    vessel: {
      name: 'FV Andean Wave',
      imo_number: '9301234',
      model: 'Trawler 70m',
      flag_state: 'Chile',
      year_built: 2017
    },
    sustainability_score: {
      total_score: 76,
      grade: 'B',
      categories: {
        vessel_efficiency: { score: 78 },
        fishing_method: { score: 72 },
        environmental_practices: { score: 80 },
        compliance_and_transparency: { score: 88 },
        social_responsibility: { score: 74 }
      }
    }
  },
  {
    id: 'fishing-zone-9',
    lat: 12,
    lng: 115,
    name: 'South China Sea',
    vessel: {
      name: 'FV Dragon Pearl',
      imo_number: '9312345',
      model: 'Purse Seiner 75m',
      flag_state: 'China',
      year_built: 2013
    },
    sustainability_score: {
      total_score: 62,
      grade: 'C',
      categories: {
        vessel_efficiency: { score: 60 },
        fishing_method: { score: 58 },
        environmental_practices: { score: 65 },
        compliance_and_transparency: { score: 75 },
        social_responsibility: { score: 65 }
      }
    }
  },
  {
    id: 'fishing-zone-10',
    lat: -5,
    lng: 105,
    name: 'Java Sea',
    vessel: {
      name: 'FV Nusantara',
      imo_number: '9323456',
      model: 'Trawler 62m',
      flag_state: 'Indonesia',
      year_built: 2011
    },
    sustainability_score: {
      total_score: 65,
      grade: 'C+',
      categories: {
        vessel_efficiency: { score: 63 },
        fishing_method: { score: 60 },
        environmental_practices: { score: 68 },
        compliance_and_transparency: { score: 78 },
        social_responsibility: { score: 70 }
      }
    }
  },
  {
    id: 'fishing-zone-11',
    lat: 36,
    lng: 124,
    name: 'Yellow Sea',
    vessel: {
      name: 'FV East Wind',
      imo_number: '9334567',
      model: 'Factory Trawler 88m',
      flag_state: 'South Korea',
      year_built: 2015
    },
    sustainability_score: {
      total_score: 74,
      grade: 'B-',
      categories: {
        vessel_efficiency: { score: 76 },
        fishing_method: { score: 70 },
        environmental_practices: { score: 78 },
        compliance_and_transparency: { score: 82 },
        social_responsibility: { score: 72 }
      }
    }
  },
  {
    id: 'fishing-zone-12',
    lat: 15,
    lng: 73,
    name: 'Arabian Sea (India)',
    vessel: {
      name: 'FV Mumbai Express',
      imo_number: '9345678',
      model: 'Longliner 66m',
      flag_state: 'India',
      year_built: 2012
    },
    sustainability_score: {
      total_score: 70,
      grade: 'B-',
      categories: {
        vessel_efficiency: { score: 68 },
        fishing_method: { score: 67 },
        environmental_practices: { score: 72 },
        compliance_and_transparency: { score: 80 },
        social_responsibility: { score: 75 }
      }
    }
  },
  {
    id: 'fishing-zone-13',
    lat: -23,
    lng: 35,
    name: 'Mozambique Channel',
    vessel: {
      name: 'FV African Queen',
      imo_number: '9356789',
      model: 'Trawler 64m',
      flag_state: 'South Africa',
      year_built: 2018
    },
    sustainability_score: {
      total_score: 79,
      grade: 'B+',
      categories: {
        vessel_efficiency: { score: 80 },
        fishing_method: { score: 75 },
        environmental_practices: { score: 82 },
        compliance_and_transparency: { score: 85 },
        social_responsibility: { score: 78 }
      }
    }
  },
  {
    id: 'fishing-zone-14',
    lat: 14,
    lng: -17,
    name: 'West Africa (Senegal)',
    vessel: {
      name: 'FV Dakar Spirit',
      imo_number: '9367890',
      model: 'Purse Seiner 71m',
      flag_state: 'Senegal',
      year_built: 2014
    },
    sustainability_score: {
      total_score: 66,
      grade: 'C+',
      categories: {
        vessel_efficiency: { score: 64 },
        fishing_method: { score: 62 },
        environmental_practices: { score: 68 },
        compliance_and_transparency: { score: 78 },
        social_responsibility: { score: 72 }
      }
    }
  },
  {
    id: 'fishing-zone-15',
    lat: -28,
    lng: 16,
    name: 'Benguela Current',
    vessel: {
      name: 'FV Namibian Pride',
      imo_number: '9378901',
      model: 'Factory Trawler 92m',
      flag_state: 'Namibia',
      year_built: 2016
    },
    sustainability_score: {
      total_score: 81,
      grade: 'A-',
      categories: {
        vessel_efficiency: { score: 83 },
        fishing_method: { score: 78 },
        environmental_practices: { score: 85 },
        compliance_and_transparency: { score: 88 },
        social_responsibility: { score: 80 }
      }
    }
  },
  {
    id: 'fishing-zone-16',
    lat: 40,
    lng: 15,
    name: 'Mediterranean Sea',
    vessel: {
      name: 'FV Mare Nostrum',
      imo_number: '9389012',
      model: 'Purse Seiner 69m',
      flag_state: 'Italy',
      year_built: 2013
    },
    sustainability_score: {
      total_score: 77,
      grade: 'B',
      categories: {
        vessel_efficiency: { score: 75 },
        fishing_method: { score: 73 },
        environmental_practices: { score: 80 },
        compliance_and_transparency: { score: 90 },
        social_responsibility: { score: 76 }
      }
    }
  },
  {
    id: 'fishing-zone-17',
    lat: 52,
    lng: -5,
    name: 'Irish Sea',
    vessel: {
      name: 'FV Celtic Tide',
      imo_number: '9390123',
      model: 'Trawler 67m',
      flag_state: 'Ireland',
      year_built: 2017
    },
    sustainability_score: {
      total_score: 84,
      grade: 'A',
      categories: {
        vessel_efficiency: { score: 86 },
        fishing_method: { score: 82 },
        environmental_practices: { score: 88 },
        compliance_and_transparency: { score: 92 },
        social_responsibility: { score: 79 }
      }
    }
  },
  {
    id: 'fishing-zone-18',
    lat: 8,
    lng: -80,
    name: 'Eastern Pacific (Panama)',
    vessel: {
      name: 'FV Panama Blue',
      imo_number: '9401234',
      model: 'Longliner 74m',
      flag_state: 'Panama',
      year_built: 2015
    },
    sustainability_score: {
      total_score: 72,
      grade: 'B-',
      categories: {
        vessel_efficiency: { score: 70 },
        fishing_method: { score: 68 },
        environmental_practices: { score: 75 },
        compliance_and_transparency: { score: 82 },
        social_responsibility: { score: 73 }
      }
    }
  },
  {
    id: 'fishing-zone-19',
    lat: -40,
    lng: -58,
    name: 'Argentina Coast',
    vessel: {
      name: 'FV Patagonian Wind',
      imo_number: '9412345',
      model: 'Trawler 76m',
      flag_state: 'Argentina',
      year_built: 2019
    },
    sustainability_score: {
      total_score: 83,
      grade: 'A-',
      categories: {
        vessel_efficiency: { score: 85 },
        fishing_method: { score: 80 },
        environmental_practices: { score: 87 },
        compliance_and_transparency: { score: 90 },
        social_responsibility: { score: 81 }
      }
    }
  },
  {
    id: 'fishing-zone-20',
    lat: 65,
    lng: 12,
    name: 'Norwegian Sea',
    vessel: {
      name: 'FV Viking Explorer',
      imo_number: '9423456',
      model: 'Factory Trawler 98m',
      flag_state: 'Norway',
      year_built: 2020
    },
    sustainability_score: {
      total_score: 89,
      grade: 'A+',
      categories: {
        vessel_efficiency: { score: 92 },
        fishing_method: { score: 88 },
        environmental_practices: { score: 94 },
        compliance_and_transparency: { score: 95 },
        social_responsibility: { score: 85 }
      }
    }
  }
];


