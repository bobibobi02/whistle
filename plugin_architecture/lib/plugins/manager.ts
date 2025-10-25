import { prisma } from '@/lib/prisma';

export async function listPlugins() {
  return prisma.plugin.findMany();
}

export async function togglePlugin(key: string, enabled: boolean) {
  return prisma.plugin.update({ where: { key }, data: { enabled } });
}

export async function updatePluginConfig(key: string, config: any) {
  return prisma.plugin.update({ where: { key }, data: { config } });
}

// Example hook registration
export async function runHook(subforum: string, payload: any) {
  const plugins = await prisma.plugin.findMany({ where: { enabled: true } });
  for (const plugin of plugins) {
    try {
      const hook = require(plugin.key)[subforum];
      if (typeof hook === 'function') {
        await hook(payload, plugin.config);
      }
    } catch (e) {
      console.error(`Plugin ${plugin.key} hook ${subforum} failed`, e);
    }
  }
}
