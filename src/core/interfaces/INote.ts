import ICard from './ICard';

export default interface INote {
  id: any;
  guid: any;
  mid: any;
  mod: any;
  usn: any;
  tags: any;
  flds: any;
  sfld: any;
  csum: any;
  flags: any;
  data: any;
  cards?: ICard[];
}
