import Db from './Db.js';

export default class Anki21bDb extends Db {
  private async getFields(ntid: string) {
    return await this.all(`SELECT * FROM fields WHERE ntid = ${ntid}`);
  }

  /**
   * Get templates list
   * @param ntid - model id (mid in cards)?
   * @returns
   */
  private async getTemplates(ntid?: string): Promise<Array<any>> {
    let rows = [];

    if (ntid) {
      rows = await this.all(`SELECT * FROM templates WHERE ntid = ${ntid} ORDER BY ord`);
    } else {
      rows = await this.all(`SELECT * FROM templates ORDER BY ord`);
    }

    rows = rows.map((row) => {
      const newRow = Object.assign({}, row);

      if (Buffer.isBuffer(row.config)) newRow.config = row.config.toString();
      this.convertTemplate(newRow);
      return newRow;
    });

    return rows;
  }

  private convertTemplate(template: Record<string, any>) {
    if (template) {
      const splitted = (template?.config || '').split(`\u0012`);
      template.qfmt = splitted?.[0] || '';
      template.afmt = splitted?.[1] || '';
    }
  }

  async getModels(): Promise<any> {
    const models = await this.getNoteTypes();
    const res: Record<string, any> = {};
    if (models?.length) {
      for (const model of models) {
        if (model && model.id) {
          res[model?.id] = model;
          res[model?.id].tmpls = (await this.getTemplates(model.id)) || [];
          res[model?.id].flds = (await this.getFields(model.id)) || [];
        }
      }
    }

    return res;
  }

  private async getNoteTypes(): Promise<any> {
    const res = await this.all('SELECT * FROM notetypes');
    return res;
  }

  private async getNoteType(id: string): Promise<any> {
    const res = await this.get(`SELECT * FROM notetypes WHERE ntid = ${id}`);
    return res;
  }
}
