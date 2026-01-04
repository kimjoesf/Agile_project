import prisma from './prisma';

/**
 * EAV Helper Utilities
 * Provides functions to read/write Entity-Attribute-Value data
 */

/**
 * Get or create an attribute definition
 * @param {string} entityType - EntityType enum value
 * @param {string} name - Attribute name
 * @param {string} dataType - AttributeDataType enum value
 * @param {object} options - Optional: isRequired, defaultValue, description
 * @returns {Promise<Attribute>}
 */
export async function getOrCreateAttribute(entityType, name, dataType, options = {}) {
  try {
    // Try to find existing attribute
    const existing = await prisma.attribute.findUnique({
      where: {
        entityType_name: {
          entityType,
          name,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new attribute
    return await prisma.attribute.create({
      data: {
        entityType,
        name,
        dataType,
        isRequired: options.isRequired || false,
        defaultValue: options.defaultValue || null,
        description: options.description || null,
      },
    });
  } catch (error) {
    console.error(`Error getting/creating attribute ${entityType}.${name}:`, error);
    throw error;
  }
}

/**
 * Set an attribute value for an entity
 * @param {string} entityType - EntityType enum value
 * @param {string} entityId - ID of the entity
 * @param {string} attributeName - Name of the attribute
 * @param {any} value - Value to store (will be converted to string)
 * @param {string} dataType - AttributeDataType enum value (optional, will be inferred if attribute exists)
 * @returns {Promise<EntityAttributeValue>}
 */
export async function setAttributeValue(entityType, entityId, attributeName, value, dataType = null) {
  try {
    // Get or create attribute
    let attribute;
    if (dataType) {
      attribute = await getOrCreateAttribute(entityType, attributeName, dataType);
    } else {
      attribute = await prisma.attribute.findUnique({
        where: {
          entityType_name: {
            entityType,
            name: attributeName,
          },
        },
      });

      if (!attribute) {
        throw new Error(`Attribute ${entityType}.${attributeName} not found. Provide dataType to create it.`);
      }
    }

    // Convert value to string based on dataType
    let stringValue;
    switch (attribute.dataType) {
      case 'JSON':
        stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        break;
      case 'BOOLEAN':
        stringValue = value === true || value === 'true' ? 'true' : 'false';
        break;
      case 'INTEGER':
      case 'FLOAT':
        stringValue = String(value);
        break;
      case 'DATE':
        stringValue = value instanceof Date ? value.toISOString() : String(value);
        break;
      default:
        stringValue = String(value);
    }

    // Upsert the value
    return await prisma.entityAttributeValue.upsert({
      where: {
        entityType_entityId_attributeId: {
          entityType,
          entityId,
          attributeId: attribute.id,
        },
      },
      update: {
        value: stringValue,
      },
      create: {
        entityType,
        entityId,
        attributeId: attribute.id,
        value: stringValue,
      },
    });
  } catch (error) {
    console.error(`Error setting attribute value ${entityType}.${entityId}.${attributeName}:`, error);
    throw error;
  }
}

/**
 * Get an attribute value for an entity
 * @param {string} entityType - EntityType enum value
 * @param {string} entityId - ID of the entity
 * @param {string} attributeName - Name of the attribute
 * @returns {Promise<any>} - Converted value based on dataType, or null if not found
 */
export async function getAttributeValue(entityType, entityId, attributeName) {
  try {
    const eav = await prisma.entityAttributeValue.findFirst({
      where: {
        entityType,
        entityId,
        attribute: {
          name: attributeName,
        },
      },
      include: {
        attribute: true,
      },
    });

    if (!eav) {
      return null;
    }

    // Convert value based on dataType
    switch (eav.attribute.dataType) {
      case 'JSON':
        try {
          return JSON.parse(eav.value);
        } catch {
          return eav.value;
        }
      case 'BOOLEAN':
        return eav.value === 'true';
      case 'INTEGER':
        return parseInt(eav.value, 10);
      case 'FLOAT':
        return parseFloat(eav.value);
      case 'DATE':
        return new Date(eav.value);
      default:
        return eav.value;
    }
  } catch (error) {
    console.error(`Error getting attribute value ${entityType}.${entityId}.${attributeName}:`, error);
    return null;
  }
}

/**
 * Get all attribute values for an entity
 * @param {string} entityType - EntityType enum value
 * @param {string} entityId - ID of the entity
 * @returns {Promise<Object>} - Object with attribute names as keys and converted values
 */
export async function getAllAttributeValues(entityType, entityId) {
  try {
    const eavs = await prisma.entityAttributeValue.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        attribute: true,
      },
    });

    const result = {};
    for (const eav of eavs) {
      // Convert value based on dataType
      switch (eav.attribute.dataType) {
        case 'JSON':
          try {
            result[eav.attribute.name] = JSON.parse(eav.value);
          } catch {
            result[eav.attribute.name] = eav.value;
          }
          break;
        case 'BOOLEAN':
          result[eav.attribute.name] = eav.value === 'true';
          break;
        case 'INTEGER':
          result[eav.attribute.name] = parseInt(eav.value, 10);
          break;
        case 'FLOAT':
          result[eav.attribute.name] = parseFloat(eav.value);
          break;
        case 'DATE':
          result[eav.attribute.name] = new Date(eav.value);
          break;
        default:
          result[eav.attribute.name] = eav.value;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error getting all attribute values ${entityType}.${entityId}:`, error);
    return {};
  }
}

/**
 * Delete an attribute value for an entity
 * @param {string} entityType - EntityType enum value
 * @param {string} entityId - ID of the entity
 * @param {string} attributeName - Name of the attribute
 * @returns {Promise<void>}
 */
export async function deleteAttributeValue(entityType, entityId, attributeName) {
  try {
    const attribute = await prisma.attribute.findUnique({
      where: {
        entityType_name: {
          entityType,
          name: attributeName,
        },
      },
    });

    if (!attribute) {
      return;
    }

    await prisma.entityAttributeValue.deleteMany({
      where: {
        entityType,
        entityId,
        attributeId: attribute.id,
      },
    });
  } catch (error) {
    console.error(`Error deleting attribute value ${entityType}.${entityId}.${attributeName}:`, error);
    throw error;
  }
}

/**
 * Delete all attribute values for an entity
 * @param {string} entityType - EntityType enum value
 * @param {string} entityId - ID of the entity
 * @returns {Promise<void>}
 */
export async function deleteAllAttributeValues(entityType, entityId) {
  try {
    await prisma.entityAttributeValue.deleteMany({
      where: {
        entityType,
        entityId,
      },
    });
  } catch (error) {
    console.error(`Error deleting all attribute values ${entityType}.${entityId}:`, error);
    throw error;
  }
}

/**
 * Course Materials Helpers
 */

/**
 * Get course materials as array
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} - Array of material objects
 */
export async function getCourseMaterials(courseId) {
  const materialsJson = await getAttributeValue('COURSE', courseId, 'materials');
  if (!materialsJson) {
    return [];
  }
  // If it's already an array, return it
  if (Array.isArray(materialsJson)) {
    return materialsJson;
  }
  // If it's a string, try to parse it
  if (typeof materialsJson === 'string') {
    try {
      return JSON.parse(materialsJson);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Set course materials
 * @param {string} courseId - Course ID
 * @param {Array} materials - Array of material objects
 * @returns {Promise<void>}
 */
export async function setCourseMaterials(courseId, materials) {
  await setAttributeValue('COURSE', courseId, 'materials', materials, 'JSON');
}

/**
 * Add a material to course
 * @param {string} courseId - Course ID
 * @param {object} material - Material object
 * @returns {Promise<void>}
 */
export async function addCourseMaterial(courseId, material) {
  const existing = await getCourseMaterials(courseId);
  existing.push(material);
  await setCourseMaterials(courseId, existing);
}

/**
 * Quiz Questions Helpers
 */

/**
 * Get quiz questions as array
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Array>} - Array of question objects
 */
export async function getQuizQuestions(quizId) {
  const questionsJson = await getAttributeValue('QUIZ', quizId, 'questions');
  if (!questionsJson) {
    return [];
  }
  // If it's already an array, return it
  if (Array.isArray(questionsJson)) {
    return questionsJson;
  }
  // If it's a string, try to parse it
  if (typeof questionsJson === 'string') {
    try {
      return JSON.parse(questionsJson);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Set quiz questions
 * @param {string} quizId - Quiz ID
 * @param {Array} questions - Array of question objects
 * @returns {Promise<void>}
 */
export async function setQuizQuestions(quizId, questions) {
  await setAttributeValue('QUIZ', quizId, 'questions', questions, 'JSON');
}

/**
 * Transcript Courses Helpers
 */

/**
 * Get transcript courses as array
 * @param {string} transcriptId - Transcript ID
 * @returns {Promise<Array>} - Array of course objects
 */
export async function getTranscriptCourses(transcriptId) {
  const coursesJson = await getAttributeValue('TRANSCRIPT', transcriptId, 'courses');
  if (!coursesJson) {
    return [];
  }
  // If it's already an array, return it
  if (Array.isArray(coursesJson)) {
    return coursesJson;
  }
  // If it's a string, try to parse it
  if (typeof coursesJson === 'string') {
    try {
      return JSON.parse(coursesJson);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Set transcript courses
 * @param {string} transcriptId - Transcript ID
 * @param {Array} courses - Array of course objects
 * @returns {Promise<void>}
 */
export async function setTranscriptCourses(transcriptId, courses) {
  await setAttributeValue('TRANSCRIPT', transcriptId, 'courses', courses, 'JSON');
}

/**
 * Admission Documents Helpers
 */

/**
 * Get admission documents as array
 * @param {string} admissionId - Admission ID
 * @returns {Promise<Array>} - Array of document objects
 */
export async function getAdmissionDocuments(admissionId) {
  const documentsJson = await getAttributeValue('ADMISSION', admissionId, 'documents');
  if (!documentsJson) {
    return [];
  }
  // If it's already an array, return it
  if (Array.isArray(documentsJson)) {
    return documentsJson;
  }
  // If it's a string, try to parse it
  if (typeof documentsJson === 'string') {
    try {
      return JSON.parse(documentsJson);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Set admission documents
 * @param {string} admissionId - Admission ID
 * @param {Array} documents - Array of document objects
 * @returns {Promise<void>}
 */
export async function setAdmissionDocuments(admissionId, documents) {
  await setAttributeValue('ADMISSION', admissionId, 'documents', documents, 'JSON');
}

