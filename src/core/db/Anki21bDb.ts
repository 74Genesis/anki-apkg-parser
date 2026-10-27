import Db from './Db.js';

export default class Anki21bDb extends Db {
  private async getFields(ntid: string) {
    return await this.all(`SELECT * FROM fields WHERE ntid = ?`, ntid);
  }

  /**
   * Get templates list
   * @param ntid - model id (mid in cards)?
   * @returns
   */
  private async getTemplates(ntid?: string): Promise<Array<any>> {
    let rows = [];

    if (ntid) {
      rows = await this.all(`SELECT * FROM templates WHERE ntid = ? ORDER BY ord`, ntid);
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

  /**
   * In the new format col.conf/models/decks/dconf/tags are empty,
   * the data is stored in separate tables. Fill them to match the legacy shape where possible.
   * @returns collection json
   */
  async getCollection(): Promise<any> {
    const res = await this.get('SELECT * FROM col');

    res.conf = {};
    for (const row of await this.all('SELECT * FROM config')) {
      res.conf[row.KEY] = JSON.parse(row.val.toString());
    }

    res.models = await this.getModels();

    // common/kind are Protocol Buffers messages, kept as Buffer
    res.decks = {};
    for (const row of await this.all('SELECT * FROM decks')) {
      res.decks[row.id] = { ...row, name: row.name.replaceAll('\x1f', '::') };
    }

    // config is a Protocol Buffers message, kept as Buffer
    res.dconf = {};
    for (const row of await this.all('SELECT * FROM deck_config')) {
      res.dconf[row.id] = row;
    }

    res.tags = {};
    for (const row of await this.all('SELECT tag, usn FROM tags')) {
      res.tags[row.tag] = row.usn;
    }

    return res;
  }

  private async getNoteTypes(): Promise<any> {
    const res = await this.all('SELECT * FROM notetypes');
    return res;
  }

  private async getNoteType(id: string): Promise<any> {
    const res = await this.get(`SELECT * FROM notetypes WHERE id = ?`, id);
    return res;
  }
}
