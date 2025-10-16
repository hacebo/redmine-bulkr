/**
 * Utility functions for activity-based color coding
 */

export type ActivityColorClasses = {
  background: string;
  text: string;
  border: string;
};

/**
 * Get color classes for an activity based on its name
 * @param activityName - The name of the activity
 * @returns Object with background, text, and border color classes
 */
export function getActivityColor(activityName: string): ActivityColorClasses {
  const name = activityName.toLowerCase();
  
  if (name.includes('meeting') || name.includes('call')) {
    return {
      background: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-800 dark:text-purple-100',
      border: 'border-purple-200 dark:border-purple-800'
    };
  }
  
  if (name.includes('development') || name.includes('coding')) {
    return {
      background: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-100',
      border: 'border-green-200 dark:border-green-800'
    };
  }
  
  if (name.includes('review') || name.includes('testing')) {
    return {
      background: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-100',
      border: 'border-orange-200 dark:border-orange-800'
    };
  }
  
  if (name.includes('documentation') || name.includes('doc')) {
    return {
      background: 'bg-cyan-100 dark:bg-cyan-900',
      text: 'text-cyan-800 dark:text-cyan-100',
      border: 'border-cyan-200 dark:border-cyan-800'
    };
  }
  
  if (name.includes('design')) {
    return {
      background: 'bg-pink-100 dark:bg-pink-900',
      text: 'text-pink-800 dark:text-pink-100',
      border: 'border-pink-200 dark:border-pink-800'
    };
  }
  
  if (name.includes('support') || name.includes('bug')) {
    return {
      background: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-100',
      border: 'border-red-200 dark:border-red-800'
    };
  }
  
  if (name.includes('vacation') || name.includes('pto') || name.includes('holiday')) {
    return {
      background: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-100',
      border: 'border-blue-200 dark:border-blue-800'
    };
  }
  
  // Default fallback
  return {
    background: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-100',
    border: 'border-gray-200 dark:border-gray-700'
  };
}

/**
 * Get combined color classes as a single string (for direct className usage)
 * @param activityName - The name of the activity
 * @returns Combined color classes string
 */
export function getActivityColorClasses(activityName: string): string {
  const colors = getActivityColor(activityName);
  return `${colors.background} ${colors.text} ${colors.border}`;
}

/**
 * Get activity color information with metadata
 * @param activityName - The name of the activity
 * @returns Object with color classes and metadata
 */
export function getActivityColorInfo(activityName: string) {
  const colors = getActivityColor(activityName);
  const name = activityName.toLowerCase();
  
  let category = 'other';
  let description = 'General activity';
  
  if (name.includes('meeting') || name.includes('call')) {
    category = 'meeting';
    description = 'Meeting or call';
  } else if (name.includes('development') || name.includes('coding')) {
    category = 'development';
    description = 'Development work';
  } else if (name.includes('review') || name.includes('testing')) {
    category = 'review';
    description = 'Review or testing';
  } else if (name.includes('documentation') || name.includes('doc')) {
    category = 'documentation';
    description = 'Documentation work';
  } else if (name.includes('design')) {
    category = 'design';
    description = 'Design work';
  } else if (name.includes('support') || name.includes('bug')) {
    category = 'support';
    description = 'Support or bug fix';
  } else if (name.includes('vacation') || name.includes('pto') || name.includes('holiday')) {
    category = 'vacation';
    description = 'Time off';
  }
  
  return {
    ...colors,
    category,
    description
  };
}
