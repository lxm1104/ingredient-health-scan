import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { connectDB, logger } from '../src/config/database.js';
// 导入模型以确保它们被注册
import Product from '../src/models/Product.js';
import Ingredient from '../src/models/Ingredient.js';
import { 
  performDeduplication, 
  getDeduplicationStats 
} from '../src/services/productDeduplicationService.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * 数据库去重脚本
 * 用于批量清理数据库中的重复产品
 */
class DatabaseDeduplicator {
  constructor() {
    this.stats = null;
    this.config = {
      threshold: 0.85,      // 相似度阈值
      maxProcessed: 1000,   // 最大处理数量
      saveBackup: true,     // 是否保存备份
      batchSize: 50         // 批处理大小
    };
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      console.log('🔧 正在连接数据库...');
      await connectDB();
      console.log('✅ 数据库连接成功');
      
      // 确保模型已注册
      console.log('📋 注册数据模型...');
      console.log(`Product模型: ${Product.modelName}`);
      console.log(`Ingredient模型: ${Ingredient.modelName}`);
      console.log('✅ 模型注册完成');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 获取去重统计信息
   */
  async getStats() {
    try {
      console.log('\n📊 正在分析数据库...');
      this.stats = await getDeduplicationStats();
      
      if (this.stats.error) {
        console.error('❌ 获取统计信息失败:', this.stats.error);
        return false;
      }

      console.log('📈 数据库统计信息:');
      console.log(`   总产品数: ${this.stats.totalProducts}`);
      console.log(`   潜在重复产品数: ${this.stats.potentialDuplicates}`);
      console.log(`   重复组数: ${this.stats.duplicateGroups}`);
      console.log(`   预计可减少: ${this.stats.estimatedReduction}%`);
      
      if (this.stats.topDuplicates && this.stats.topDuplicates.length > 0) {
        console.log('\n🔍 发现的主要重复产品:');
        this.stats.topDuplicates.slice(0, 5).forEach((dup, index) => {
          console.log(`   ${index + 1}. ${dup.product1Name} (相似度: ${(parseFloat(dup.similarity) * 100).toFixed(1)}%)`);
        });
      }

      return true;
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
      return false;
    }
  }

  /**
   * 执行试运行
   */
  async runDryRun() {
    try {
      console.log('\n🧪 执行试运行模式...');
      const result = await performDeduplication({
        dryRun: true,
        threshold: this.config.threshold,
        maxProcessed: this.config.maxProcessed,
        saveBackup: this.config.saveBackup
      });

      if (result.error) {
        console.error('❌ 试运行失败:', result.error);
        return false;
      }

      console.log('\n📋 试运行结果:');
      console.log(`   处理的产品数: ${result.summary.processedProducts}`);
      console.log(`   发现的重复组: ${result.summary.duplicateGroups}`);
      console.log(`   可删除的重复产品: ${result.summary.duplicatesFound}`);
      console.log(`   预计减少比例: ${result.summary.estimatedReduction}%`);

      if (result.summary.duplicatesFound > 0) {
        console.log('\n⚠️  警告: 以下产品将被标记为重复并删除:');
        // 这里可以添加更详细的重复产品信息展示
      }

      return result;
    } catch (error) {
      console.error('❌ 试运行失败:', error.message);
      return false;
    }
  }

  /**
   * 执行实际去重操作
   */
  async runActualDeduplication() {
    try {
      console.log('\n🚀 开始执行实际去重操作...');
      console.log('⚠️  注意: 这将实际删除重复产品，请确保已备份数据！');
      
      const result = await performDeduplication({
        dryRun: false,
        threshold: this.config.threshold,
        maxProcessed: this.config.maxProcessed,
        saveBackup: this.config.saveBackup
      });

      if (result.error) {
        console.error('❌ 去重操作失败:', result.error);
        return false;
      }

      console.log('\n🎉 去重操作完成!');
      console.log(`   处理的产品数: ${result.summary.processedProducts}`);
      console.log(`   删除的重复产品: ${result.summary.duplicatesRemoved}`);
      console.log(`   实际减少比例: ${result.summary.estimatedReduction}%`);
      console.log(`   错误数量: ${result.summary.errors}`);

      if (result.backup) {
        console.log(`   备份文件: ${result.backup}`);
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  操作中遇到的错误:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      return result;
    } catch (error) {
      console.error('❌ 去重操作失败:', error.message);
      return false;
    }
  }

  /**
   * 用户确认操作
   */
  async getUserConfirmation(message) {
    return new Promise((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(`${message} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * 主执行函数
   */
  async run() {
    try {
      console.log('🚀 数据库去重脚本启动');
      console.log('================================');

      // 初始化
      await this.initialize();

      // 获取统计信息
      const statsSuccess = await this.getStats();
      if (!statsSuccess) {
        console.error('❌ 无法获取数据库统计信息，脚本终止');
        process.exit(1);
      }

      // 如果没有重复产品，直接退出
      if (this.stats.potentialDuplicates === 0) {
        console.log('\n✅ 数据库中没有发现重复产品，无需执行去重操作');
        process.exit(0);
      }

      // 执行试运行
      const dryRunResult = await this.runDryRun();
      if (!dryRunResult) {
        console.error('❌ 试运行失败，脚本终止');
        process.exit(1);
      }

      // 如果试运行没有发现可删除的重复项
      if (dryRunResult.summary.duplicatesFound === 0) {
        console.log('\n✅ 试运行完成，没有发现可删除的重复产品');
        process.exit(0);
      }

      // 用户确认是否执行实际操作
      console.log('\n' + '='.repeat(50));
      const confirmed = await this.getUserConfirmation(
        `发现 ${dryRunResult.summary.duplicatesFound} 个重复产品可以删除，是否继续执行实际去重操作？`
      );

      if (!confirmed) {
        console.log('\n🛑 用户取消操作，脚本终止');
        process.exit(0);
      }

      // 执行实际去重
      const actualResult = await this.runActualDeduplication();
      if (!actualResult) {
        console.error('❌ 实际去重操作失败');
        process.exit(1);
      }

      console.log('\n🎉 数据库去重操作完成!');
      console.log('================================');

    } catch (error) {
      console.error('❌ 脚本执行失败:', error.message);
      logger.error(`数据库去重脚本失败: ${error.message}`);
      process.exit(1);
    } finally {
      // 关闭数据库连接
      process.exit(0);
    }
  }
}

// 检查是否作为主模块运行
if (import.meta.url === `file://${process.argv[1]}`) {
  const deduplicator = new DatabaseDeduplicator();
  deduplicator.run();
}

export default DatabaseDeduplicator; 