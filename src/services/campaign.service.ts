import { Campaign, CreateCampaignDto, UpdateCampaignDto } from '../models/campaign.model';
import { getStorage } from '../storage';
import { generateId } from '../utils/id-generator';

const storage = getStorage();

export async function createCampaign(dto: CreateCampaignDto): Promise<Campaign> {
  // Check slug uniqueness
  const existing = await storage.getCampaignBySlug(dto.slug);
  if (existing) {
    throw new Error(`Campaign with slug "${dto.slug}" already exists`);
  }

  const campaign: Campaign = {
    id: generateId(),
    name: dto.name,
    slug: dto.slug,
    iosUrl: dto.iosUrl,
    androidUrl: dto.androidUrl,
    fallbackUrl: dto.fallbackUrl,
    metadata: dto.metadata || {},
    clickCount: 0,
    installCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return storage.createCampaign(campaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  return storage.getCampaignById(id);
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  return storage.getCampaignBySlug(slug);
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  return storage.getAllCampaigns();
}

export async function updateCampaign(id: string, dto: UpdateCampaignDto): Promise<Campaign | null> {
  // If updating slug, check uniqueness
  if (dto.slug) {
    const existing = await storage.getCampaignBySlug(dto.slug);
    if (existing && existing.id !== id) {
      throw new Error(`Campaign with slug "${dto.slug}" already exists`);
    }
  }

  return storage.updateCampaign(id, dto);
}

export async function deleteCampaign(id: string): Promise<boolean> {
  return storage.deleteCampaign(id);
}
